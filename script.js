// Nonaktifkan pemulihan posisi scroll otomatis browser
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if (window.location.hash) {
  history.replaceState(null, null, window.location.pathname + window.location.search);
}

window.scrollTo(0, 0);

/* Format Button */
document.addEventListener("DOMContentLoaded", function () {

    const backToTop = document.getElementById("backToTop");

    if (!backToTop) return;

    // Tampilkan tombol setelah scroll 300px
    function toggleBackToTop() {
        if (window.scrollY > 300) {
            backToTop.classList.add("show");
        } else {
            backToTop.classList.remove("show");
        }
    }

    // Pantau posisi scroll
    window.addEventListener(
        "scroll",
        toggleBackToTop,
        { passive: true }
    );

    // Kembali ke bagian atas
    backToTop.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // Periksa posisi awal halaman
    toggleBackToTop();

});


/**
 * Modul Aplikasi Kuis Operasi Hitung Bilangan Bulat
 * Arsitektur berbasis Abstract Syntax Tree (AST) untuk generasi soal,
 * evaluasi deterministik, dan pembuatan pembahasan otomatis.
 */

/* ==========================================================================
   1. KONFIGURASI & KONSTANTA
   ========================================================================== */

const CONFIG = {
  MAX_GENERATION_ATTEMPTS: 120,
  HISTORY_LIMIT: 25,
  OPERATORS: ["+", "-", "*", "/"],
  OPERATOR_SYMBOLS: {
    "+": "+",
    "-": "-",
    "*": "×",
    "/": "÷",
  },
  PRECEDENCE: {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
  },
  LEVEL_LABELS: {
    1: "Level 1 — Dasar",
    2: "Level 2 — Menengah",
    3: "Level 3 — Lanjutan",
  },
  TYPE_LABELS: {
    direct: "Soal Polos",
    story: "Soal Cerita",
  },
  POSITIVE_FEEDBACKS: [
    "Tepat sekali! Perhitungan dan urutan operasimu sudah benar.",
    "Hebat! Kamu memahami aturan operasi bilangan bulat dengan baik.",
    "Benar! Ketelitianmu terhadap tanda positif dan negatif sangat bagus.",
    "Sempurna! Langkah perhitunganmu akurat.",
  ],
};

/* ==========================================================================
   2. STATE APLIKASI (TERISOLASI DALAM MODUL)
   ========================================================================== */

const appState = {
  level: 1,
  questionType: "mixed",
  currentQuestion: null,
  recentFingerprints: [],
  isAnswered: false,
};

/* ==========================================================================
   3. UTILITAS MATEMATIKA & PEMFORMATAN
   ========================================================================== */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Menghasilkan bilangan bulat acak sesuai rentang level dan aturan nol.
 */
function generateOperand(level, allowZero = true) {
  let min = -15;
  let max = 15;

  if (level === 1) {
    min = -25;
    max = 25;
  } else if (level === 2) {
    min = -15;
    max = 15;
  } else {
    min = -12;
    max = 12;
  }

  let value = randomInt(min, max);
  if (!allowZero && value === 0) {
    value = Math.random() < 0.5 ? randomInt(min, -1) : randomInt(1, max);
  }
  return value;
}

/**
 * Memformat bilangan bulat: bilangan negatif diberi tanda kurung
 * apabila bukan berada di awal ekspresi utama atau saat di dalam operasi.
 */
function formatOperand(value, wrapNegative = false) {
  if (value < 0 && wrapNegative) {
    return `(${value})`;
  }
  return String(value);
}

/* ==========================================================================
   4. ABSTRACT SYNTAX TREE (AST): PEMBANGUNAN, SERIALISASI, & EVALUASI
   ========================================================================== */

function createNumberNode(value) {
  return {
    type: "Number",
    value,
  };
}

function createBinaryNode(operator, left, right, hasExplicitParens = false) {
  return {
    type: "BinaryExpression",
    operator,
    left,
    right,
    hasExplicitParens,
  };
}

/**
 * Mengubah AST menjadi string ekspresi matematika yang valid dan terbaca jelas.
 */
function serializeAST(node, isRoot = true) {
  if (node.type === "Number") {
    return formatOperand(node.value, !isRoot);
  }

  const leftStr = serializeAST(node.left, false);
  const rightStr = serializeAST(node.right, false);
  const symbol = CONFIG.OPERATOR_SYMBOLS[node.operator];
  const combined = `${leftStr} ${symbol} ${rightStr}`;

  if (!isRoot && node.hasExplicitParens) {
    return `(${combined})`;
  }

  return combined;
}

/**
 * Memvalidasi seluruh node dalam AST:
 * - Tidak ada pembagian dengan nol
 * - Setiap operasi pembagian menghasilkan bilangan bulat tanpa sisa
 * - Tidak melebihi batas aman integer JavaScript
 */
function validateExpression(node) {
  if (node.type === "Number") {
    return Number.isInteger(node.value) && Number.isSafeInteger(node.value);
  }

  if (!validateExpression(node.left) || !validateExpression(node.right)) {
    return false;
  }

  const leftVal = evaluateASTSilent(node.left);
  const rightVal = evaluateASTSilent(node.right);

  if (leftVal === null || rightVal === null) {
    return false;
  }

  let result;
  switch (node.operator) {
    case "+":
      result = leftVal + rightVal;
      break;
    case "-":
      result = leftVal - rightVal;
      break;
    case "*":
      result = leftVal * rightVal;
      break;
    case "/":
      if (rightVal === 0) return false;
      if (leftVal % rightVal !== 0) return false;
      result = leftVal / rightVal;
      break;
    default:
      return false;
  }

  return Number.isInteger(result) && Number.isSafeInteger(result);
}

/**
 * Evaluasi cepat tanpa mencatat trace (digunakan untuk validasi struktural).
 */
function evaluateASTSilent(node) {
  if (node.type === "Number") {
    return node.value;
  }

  const left = evaluateASTSilent(node.left);
  const right = evaluateASTSilent(node.right);
  if (left === null || right === null) return null;

  switch (node.operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0 || left % right !== 0) return null;
      return left / right;
    default:
      return null;
  }
}

/**
 * Mengevaluasi AST sekaligus menghasilkan execution trace langkah demi langkah.
 * Sumber kebenaran tunggal untuk jawaban akhir dan pembahasan.
 */
function evaluateExpression(rootNode) {
  const steps = [];

  function explainRule(node) {
    const opName = {
      "+": "penjumlahan",
      "-": "pengurangan",
      "*": "perkalian",
      "/": "pembagian",
    }[node.operator];

    if (node.hasExplicitParens) {
      return `Kerjakan operasi ${opName} di dalam tanda kurung terlebih dahulu.`;
    }
    if (node.operator === "*" || node.operator === "/") {
      return `Operasi ${opName} memiliki prioritas lebih tinggi daripada penjumlahan/pengurangan (dikerjakan dari kiri ke kanan).`;
    }
    return `Kerjakan operasi ${opName} sesuai urutan dari kiri ke kanan.`;
  }

  function reduceNode(node) {
    if (node.type === "Number") {
      return node.value;
    }

    const leftVal = reduceNode(node.left);
    const rightVal = reduceNode(node.right);

    let result;
    switch (node.operator) {
      case "+":
        result = leftVal + rightVal;
        break;
      case "-":
        result = leftVal - rightVal;
        break;
      case "*":
        result = leftVal * rightVal;
        break;
      case "/":
        result = leftVal / rightVal;
        break;
    }

    const symbol = CONFIG.OPERATOR_SYMBOLS[node.operator];
    const leftFormatted = formatOperand(leftVal, false);
    const rightFormatted = formatOperand(rightVal, true);

    steps.push({
      stepNumber: steps.length + 1,
      expressionPart: `${leftFormatted} ${symbol} ${rightFormatted}`,
      result,
      reason: explainRule(node),
    });

    return result;
  }

  const finalAnswer = reduceNode(rootNode);

  return {
    answer: finalAnswer,
    steps,
  };
}

/* ==========================================================================
   5. PEMBANGUN AST BERDASARKAN LEVEL KESULITAN
   ========================================================================== */

/**
 * Membuat node pembagian yang dijamin menghasilkan bilangan bulat.
 */
function buildExactDivisionNode(level, hasParens = false) {
  const maxDivisor = level === 2 ? 9 : 8;
  let divisor = randomInt(-maxDivisor, maxDivisor);
  if (divisor === 0) divisor = randomInt(2, maxDivisor);

  const quotient = randomInt(-10, 10);
  const dividend = divisor * quotient;

  return createBinaryNode(
    "/",
    createNumberNode(dividend),
    createNumberNode(divisor),
    hasParens
  );
}

/**
 * Level 1: 1 operator (+ atau -), 2 operand bilangan bulat.
 */
function buildLevel1AST() {
  const op = pickRandom(["+", "-"]);
  const a = generateOperand(1, true);
  const b = generateOperand(1, false);
  return createBinaryNode(op, createNumberNode(a), createNumberNode(b), false);
}

/**
 * Level 2: Tepat 2 operator (+, -, *, /), 3 operand, mematuhi prioritas operasi.
 */
function buildLevel2AST() {
  const pattern = randomInt(1, 3);

  if (pattern === 1) {
    // Pola: a (+|-) (b (*|/) c) -> prioritas di kanan
    const lowOp = pickRandom(["+", "-"]);
    const highOp = pickRandom(["*", "/"]);
    const a = generateOperand(2, true);

    const rightSubtree =
      highOp === "/"
        ? buildExactDivisionNode(2, false)
        : createBinaryNode(
            "*",
            createNumberNode(randomInt(-10, 10)),
            createNumberNode(randomInt(-10, 10)),
            false
          );

    return createBinaryNode(lowOp, createNumberNode(a), rightSubtree, false);
  }

  if (pattern === 2) {
    // Pola: (a (*|/) b) (+|-) c -> prioritas di kiri
    const highOp = pickRandom(["*", "/"]);
    const lowOp = pickRandom(["+", "-"]);
    const c = generateOperand(2, false);

    const leftSubtree =
      highOp === "/"
        ? buildExactDivisionNode(2, false)
        : createBinaryNode(
            "*",
            createNumberNode(randomInt(-10, 10)),
            createNumberNode(randomInt(-10, 10)),
            false
          );

    return createBinaryNode(lowOp, leftSubtree, createNumberNode(c), false);
  }

  // Pola 3: Operasi setara kiri ke kanan, misal a - b + c atau a * b / c
  const isHighTier = Math.random() < 0.5;
  if (isHighTier) {
    const divisor = randomInt(2, 8) * (Math.random() < 0.5 ? -1 : 1);
    const factor = randomInt(-8, 8);
    const b = randomInt(-6, 6) || 2;
    const a = divisor * factor;
    // (a / divisor) * b
    const leftDiv = createBinaryNode(
      "/",
      createNumberNode(a),
      createNumberNode(divisor),
      false
    );
    return createBinaryNode("*", leftDiv, createNumberNode(b), false);
  }

  const op1 = pickRandom(["+", "-"]);
  const op2 = pickRandom(["+", "-"]);
  const left = createBinaryNode(
    op1,
    createNumberNode(generateOperand(2, true)),
    createNumberNode(generateOperand(2, false)),
    false
  );
  return createBinaryNode(op2, left, createNumberNode(generateOperand(2, false)), false);
}

/**
 * Level 3: 3 hingga 4 operator, melibatkan tanda kurung dan operasi campuran.
 */
function buildLevel3AST() {
  const structure = randomInt(1, 3);

  if (structure === 1) {
    // Struktur 3 operator: (a (+|-) b) * c - d
    const innerOp = pickRandom(["+", "-"]);
    const a = generateOperand(3, false);
    const b = generateOperand(3, false);
    const parenNode = createBinaryNode(
      innerOp,
      createNumberNode(a),
      createNumberNode(b),
      true
    );

    const c = randomInt(-8, 8) || 3;
    const multNode = createBinaryNode("*", parenNode, createNumberNode(c), false);

    const outerOp = pickRandom(["+", "-"]);
    const d = generateOperand(3, false);
    return createBinaryNode(outerOp, multNode, createNumberNode(d), false);
  }

  if (structure === 2) {
    // Struktur 3 operator dengan pembagian eksak dari dalam kurung: (a + b) / c + d
    const divisor = randomInt(2, 7) * (Math.random() < 0.5 ? -1 : 1);
    const targetSum = divisor * randomInt(-8, 8);
    const a = randomInt(-15, 15);
    const b = targetSum - a;

    const parenNode = createBinaryNode(
      "+",
      createNumberNode(a),
      createNumberNode(b),
      true
    );
    const divNode = createBinaryNode("/", parenNode, createNumberNode(divisor), false);

    const outerOp = pickRandom(["+", "-"]);
    const d = generateOperand(3, false);
    return createBinaryNode(outerOp, divNode, createNumberNode(d), false);
  }

  // Struktur 4 operator: (a + b) * c - (d / e)
  const innerOp1 = pickRandom(["+", "-"]);
  const leftParen = createBinaryNode(
    innerOp1,
    createNumberNode(generateOperand(3, false)),
    createNumberNode(generateOperand(3, false)),
    true
  );
  const multNode = createBinaryNode(
    "*",
    leftParen,
    createNumberNode(randomInt(-6, 6) || 2),
    false
  );

  const rightDiv = buildExactDivisionNode(3, false);
  const rootOp = pickRandom(["+", "-"]);
  return createBinaryNode(rootOp, multNode, rightDiv, false);
}

function buildExpressionAST(level) {
  if (level === 1) return buildLevel1AST();
  if (level === 2) return buildLevel2AST();
  return buildLevel3AST();
}

/* ==========================================================================
   6. GENERATOR SOAL CERITA (MODEL MATEMATIKA -> NARASI KONTEKSTUAL)
   ========================================================================== */

const STORY_TEMPLATES = [
  {
    level: 1,
    context: "Perubahan Suhu",
    generate() {
      const initialTemp = randomInt(-12, 15);
      const change = randomInt(4, 20);
      const isRising = Math.random() < 0.5;
      const ast = createBinaryNode(
        isRising ? "+" : "-",
        createNumberNode(initialTemp),
        createNumberNode(change),
        false
      );
      const narrative = isRising
        ? `Suhu di dalam ruang pendingin mula-mula ${initialTemp}°C. Setelah mesin dimatikan sementara, suhunya naik sebesar ${change}°C. Berapa suhu ruang pendingin tersebut sekarang?`
        : `Suhu udara di puncak pegunungan pada sore hari adalah ${initialTemp}°C. Menjelang malam, suhunya turun sebesar ${change}°C. Berapa suhu udara di puncak pegunungan pada malam hari?`;

      return {
        ast,
        narrative,
        mappingNote: `Suhu awal = ${initialTemp}°C, ${
          isRising ? `naik (+${change}°C)` : `turun (-${change}°C)`
        }.`,
      };
    },
  },
  {
    level: 1,
    context: "Ketinggian dan Kedalaman",
    generate() {
      const depth = randomInt(-45, -10);
      const move = randomInt(5, 30);
      const isAscending = Math.random() < 0.6;
      const ast = createBinaryNode(
        isAscending ? "+" : "-",
        createNumberNode(depth),
        createNumberNode(move),
        false
      );
      const narrative = isAscending
        ? `Sebuah kapal selam berada pada kedalaman ${Math.abs(
            depth
          )} meter di bawah permukaan laut (${depth} m). Kapal tersebut kemudian naik sejauh ${move} meter. Di posisi berapa meter kapal selam itu berada sekarang?`
        : `Seorang penyelam berada pada posisi ${depth} meter dari permukaan laut. Ia menyelam lagi lebih dalam sejauh ${move} meter. Di posisi berapa meter penyelam itu sekarang?`;

      return {
        ast,
        narrative,
        mappingNote: `Posisi awal di bawah permukaan laut = ${depth} m, ${
          isAscending ? `bergerak naik (+${move} m)` : `menyelam lebih dalam (-${move} m)`
        }.`,
      };
    },
  },
  {
    level: 2,
    context: "Saldo dan Transaksi",
    generate() {
      const initialBalance = randomInt(20, 80);
      const itemCount = randomInt(3, 7);
      const itemCost = randomInt(5, 15);
      // Model: initialBalance - (itemCount * itemCost)
      const multNode = createBinaryNode(
        "*",
        createNumberNode(itemCount),
        createNumberNode(itemCost),
        false
      );
      const ast = createBinaryNode(
        "-",
        createNumberNode(initialBalance),
        multNode,
        false
      );
      const narrative = `Saldo kartu transportasi elektronik seorang pelajar mula-mula Rp${initialBalance}.000. Ia melakukan ${itemCount} kali perjalanan dengan tarif Rp${itemCost}.000 per perjalanan. Nyatakan sisa saldo (atau kekurangan saldo) dalam ribuan rupiah!`;

      return {
        ast,
        narrative,
        mappingNote: `Saldo awal = ${initialBalance} (ribu), pengeluaran = ${itemCount} × ${itemCost} (ribu).`,
      };
    },
  },
  {
    level: 2,
    context: "Keuntungan dan Kerugian",
    generate() {
      const lossPerDay = randomInt(4, 12);
      const days = randomInt(3, 6);
      const extraProfit = randomInt(15, 50);
      // Model: (-lossPerDay * days) + extraProfit
      const lossNode = createBinaryNode(
        "*",
        createNumberNode(-lossPerDay),
        createNumberNode(days),
        false
      );
      const ast = createBinaryNode(
        "+",
        lossNode,
        createNumberNode(extraProfit),
        false
      );
      const narrative = `Sebuah kedai mengalami kerugian sebesar Rp${lossPerDay}.000 setiap hari selama ${days} hari berturut-turut. Pada hari berikutnya, kedai tersebut memperoleh keuntungan sebesar Rp${extraProfit}.000. Berapa total keuntungan atau kerugian bersih kedai tersebut (dalam ribuan rupiah)?`;

      return {
        ast,
        narrative,
        mappingNote: `Rugi harian = -${lossPerDay} selama ${days} hari, ditambah keuntungan +${extraProfit}.`,
      };
    },
  },
  {
    level: 3,
    context: "Perubahan Suhu Bertahap",
    generate() {
      const startTemp = randomInt(-10, 6);
      const dropPerStep = randomInt(2, 5);
      const stepsCount = randomInt(3, 5);
      const finalRise = randomInt(4, 14);
      const divisor = 2;
      // Pastikan (dropPerStep * stepsCount) genap agar pembagian bulat
      const adjustedSteps = stepsCount % 2 === 0 ? stepsCount : stepsCount + 1;

      // Model: startTemp - (dropPerStep * adjustedSteps) / 2 + finalRise
      const multNode = createBinaryNode(
        "*",
        createNumberNode(dropPerStep),
        createNumberNode(adjustedSteps),
        false
      );
      const divNode = createBinaryNode(
        "/",
        multNode,
        createNumberNode(divisor),
        false
      );
      const subNode = createBinaryNode(
        "-",
        createNumberNode(startTemp),
        divNode,
        false
      );
      const ast = createBinaryNode(
        "+",
        subNode,
        createNumberNode(finalRise),
        false
      );

      const narrative = `Suhu awal suatu ruangan eksperimen adalah ${startTemp}°C. Selama ${adjustedSteps} jam, suhu diturunkan rata-rata ${dropPerStep}°C setiap 2 jam. Setelah itu, pemanas dinyalakan sehingga suhu naik ${finalRise}°C. Berapa suhu akhir ruangan tersebut?`;

      return {
        ast,
        narrative,
        mappingNote: `Suhu awal = ${startTemp}, penurunan = (${dropPerStep} × ${adjustedSteps}) ÷ ${divisor}, kenaikan akhir = +${finalRise}.`,
      };
    },
  },
  {
    level: 3,
    context: "Skor Kompetisi",
    generate() {
      const correctCount = randomInt(8, 15);
      const wrongCount = randomInt(3, 8);
      const emptyCount = randomInt(1, 5);
      // Model: (correctCount * 4) + (wrongCount * -2) + (emptyCount * -1)
      const correctScore = createBinaryNode(
        "*",
        createNumberNode(correctCount),
        createNumberNode(4),
        true
      );
      const wrongScore = createBinaryNode(
        "*",
        createNumberNode(wrongCount),
        createNumberNode(-2),
        true
      );
      const emptyScore = createBinaryNode(
        "*",
        createNumberNode(emptyCount),
        createNumberNode(-1),
        true
      );
      const firstSum = createBinaryNode("+", correctScore, wrongScore, false);
      const ast = createBinaryNode("+", firstSum, emptyScore, false);

      const narrative = `Dalam sebuah olimpiade matematika, jawaban benar mendapat skor 4, jawaban salah mendapat skor -2, dan tidak dijawab mendapat skor -1. Seorang peserta menjawab ${correctCount} soal dengan benar, ${wrongCount} soal salah, dan ${emptyCount} soal tidak dijawab. Berapa total skor peserta tersebut?`;

      return {
        ast,
        narrative,
        mappingNote: `Skor benar = (${correctCount} × 4), skor salah = (${wrongCount} × -2), skor kosong = (${emptyCount} × -1).`,
      };
    },
  },
];

function generateStoryQuestion(level) {
  const candidates = STORY_TEMPLATES.filter((tpl) => tpl.level === level);
  const chosenTemplate = pickRandom(
    candidates.length > 0 ? candidates : STORY_TEMPLATES
  );
  const built = chosenTemplate.generate();

  if (!validateExpression(built.ast)) {
    return null;
  }

  const expressionText = serializeAST(built.ast, true);
  const evaluation = evaluateExpression(built.ast);

  return {
    type: "story",
    level,
    context: chosenTemplate.context,
    promptText: built.narrative,
    expressionText,
    mappingNote: built.mappingNote,
    ast: built.ast,
    answer: evaluation.answer,
    steps: evaluation.steps,
    fingerprint: `story-${level}-${expressionText}`,
  };
}

function generateDirectQuestion(level) {
  const ast = buildExpressionAST(level);
  if (!validateExpression(ast)) {
    return null;
  }

  const expressionText = serializeAST(ast, true);
  const evaluation = evaluateExpression(ast);

  return {
    type: "direct",
    level,
    context: "Ekspresi Matematika",
    promptText: expressionText,
    expressionText,
    mappingNote: null,
    ast,
    answer: evaluation.answer,
    steps: evaluation.steps,
    fingerprint: `direct-${level}-${expressionText}`,
  };
}

/* ==========================================================================
   7. PENGENDALI DUPLIKASI & FALLBACK GENERATOR
   ========================================================================== */

function checkDuplicateQuestion(fingerprint) {
  return appState.recentFingerprints.includes(fingerprint);
}

function recordFingerprint(fingerprint) {
  appState.recentFingerprints.push(fingerprint);
  if (appState.recentFingerprints.length > CONFIG.HISTORY_LIMIT) {
    appState.recentFingerprints.shift();
  }
}

/**
 * Fallback deterministik apabila percobaan acak mencapai batas maksimum.
 */
function createFallbackQuestion(level, targetType) {
  const a = randomInt(5, 20);
  const b = randomInt(-15, -2);
  const ast = createBinaryNode("+", createNumberNode(a), createNumberNode(b), false);
  const expressionText = serializeAST(ast, true);
  const evaluation = evaluateExpression(ast);

  if (targetType === "story") {
    return {
      type: "story",
      level,
      context: "Perubahan Suhu",
      promptText: `Suhu awal suatu cairan adalah ${a}°C. Setelah dimasukkan ke ruang pendingin, suhunya berubah sebesar ${b}°C. Berapa suhu akhir cairan tersebut?`,
      expressionText,
      mappingNote: `Suhu awal = ${a}°C, perubahan suhu = ${b}°C.`,
      ast,
      answer: evaluation.answer,
      steps: evaluation.steps,
      fingerprint: `fallback-story-${Date.now()}`,
    };
  }

  return {
    type: "direct",
    level,
    context: "Ekspresi Matematika",
    promptText: expressionText,
    expressionText,
    mappingNote: null,
    ast,
    answer: evaluation.answer,
    steps: evaluation.steps,
    fingerprint: `fallback-direct-${Date.now()}`,
  };
}

/**
 * Fungsi orkestrator utama untuk menghasilkan soal baru sesuai level dan jenis soal.
 */
function generateQuestion(level, questionType) {
  const resolvedType =
    questionType === "mixed"
      ? Math.random() < 0.5
        ? "direct"
        : "story"
      : questionType;

  for (let attempt = 0; attempt < CONFIG.MAX_GENERATION_ATTEMPTS; attempt++) {
    const question =
      resolvedType === "story"
        ? generateStoryQuestion(level)
        : generateDirectQuestion(level);

    if (question && !checkDuplicateQuestion(question.fingerprint)) {
      recordFingerprint(question.fingerprint);
      return question;
    }
  }

  const fallback = createFallbackQuestion(level, resolvedType);
  recordFingerprint(fallback.fingerprint);
  return fallback;
}

/* ==========================================================================
   8. VALIDASI JAWABAN & PEMBUATAN PEMBAHASAN
   ========================================================================== */

/**
 * Memvalidasi input pengguna agar berupa bilangan bulat yang sah.
 */
function validateAnswer(rawInput, correctAnswer) {
  const trimmed = rawInput.trim();
  if (trimmed === "") {
    return {
      status: "invalid",
      message: "Kolom jawaban masih kosong. Silakan masukkan bilangan bulat.",
    };
  }

  // Izinkan tanda + atau - di awal diikuti digit angka
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return {
      status: "invalid",
      message:
        "Format tidak valid. Masukkan hanya bilangan bulat (contoh: -8, 0, atau 15).",
    };
  }

  const parsedValue = Number(trimmed);
  if (!Number.isSafeInteger(parsedValue)) {
    return {
      status: "invalid",
      message: "Angka yang dimasukkan terlalu besar.",
    };
  }

  const isCorrect = parsedValue === correctAnswer;
  return {
    status: isCorrect ? "correct" : "incorrect",
    userValue: parsedValue,
    correctAnswer,
  };
}

/**
 * Menyusun struktur data pembahasan dari hasil execution trace AST.
 */
function generateExplanation(question) {
  return {
    type: question.type,
    mappingNote: question.mappingNote,
    expressionText: question.expressionText,
    steps: question.steps,
    finalAnswer: question.answer,
  };
}

/* ==========================================================================
   9. MANIPULASI DOM & RENDERING ANTARMUKA
   ========================================================================== */

function getDomElements() {
  return {
    levelSelect: document.getElementById("level-select"),
    typeSelect: document.getElementById("type-select"),
    badgeLevel: document.getElementById("badge-level"),
    badgeType: document.getElementById("badge-type"),
    questionDisplay: document.getElementById("question-display"),
    answerForm: document.getElementById("answer-form"),
    answerInput: document.getElementById("answer-input"),
    feedbackBox: document.getElementById("feedback-box"),
    explanationPanel: document.getElementById("explanation-panel"),
    explanationContent: document.getElementById("explanation-content"),
    nextBtn: document.getElementById("next-btn"),
  };
}

function renderQuestion(elements, question) {
  elements.badgeLevel.textContent = CONFIG.LEVEL_LABELS[question.level];
  elements.badgeType.textContent =
    question.type === "story"
      ? `${CONFIG.TYPE_LABELS.story} • ${question.context}`
      : CONFIG.TYPE_LABELS.direct;

  elements.questionDisplay.innerHTML = "";
  const contentEl = document.createElement("div");

  if (question.type === "direct") {
    contentEl.className = "question-direct-expression";
    contentEl.textContent = question.promptText;
  } else {
    contentEl.className = "question-story-text";
    contentEl.textContent = question.promptText;
  }

  elements.questionDisplay.appendChild(contentEl);
}

function renderFeedback(elements, validationResult) {
  const { feedbackBox } = elements;
  feedbackBox.className = "feedback-box";
  feedbackBox.innerHTML = "";

  const titleEl = document.createElement("span");
  titleEl.className = "feedback-title";

  const descEl = document.createElement("p");

  if (validationResult.status === "invalid") {
    feedbackBox.classList.add("warning");
    titleEl.textContent = "Periksa Format Jawaban";
    descEl.textContent = validationResult.message;
  } else if (validationResult.status === "correct") {
    feedbackBox.classList.add("correct");
    titleEl.textContent = "Jawaban Benar!";
    descEl.textContent = pickRandom(CONFIG.POSITIVE_FEEDBACKS);
  } else {
    feedbackBox.classList.add("incorrect");
    titleEl.textContent = "Jawaban Belum Tepat";
    descEl.textContent = `Jawabanmu adalah ${validationResult.userValue}, sedangkan hasil yang benar adalah ${validationResult.correctAnswer}. Pelajari langkahnya di bawah ini.`;
  }

  feedbackBox.appendChild(titleEl);
  feedbackBox.appendChild(descEl);
  feedbackBox.classList.remove("hidden");
}

function renderExplanation(elements, explanationData) {
  const { explanationPanel, explanationContent } = elements;
  explanationContent.innerHTML = "";

  // 1. Model Matematika (dan pemetaan narasi jika soal cerita)
  const modelBox = document.createElement("div");
  modelBox.className = "exp-model-box";

  if (explanationData.type === "story" && explanationData.mappingNote) {
    const mapLabel = document.createElement("span");
    mapLabel.className = "exp-model-label";
    mapLabel.textContent = "Pemetaan Informasi Soal Cerita:";

    const mapText = document.createElement("p");
    mapText.style.marginBottom = "0.5rem";
    mapText.textContent = explanationData.mappingNote;

    modelBox.appendChild(mapLabel);
    modelBox.appendChild(mapText);
  }

  const exprLabel = document.createElement("span");
  exprLabel.className = "exp-model-label";
  exprLabel.textContent = "Model / Ekspresi Matematika:";

  const exprValue = document.createElement("div");
  exprValue.className = "exp-expression";
  exprValue.textContent = explanationData.expressionText;

  modelBox.appendChild(exprLabel);
  modelBox.appendChild(exprValue);
  explanationContent.appendChild(modelBox);

  // 2. Daftar Langkah Perhitungan dari AST Execution Trace
  const stepsList = document.createElement("ol");
  stepsList.className = "exp-steps";

  explanationData.steps.forEach((step) => {
    const li = document.createElement("li");
    li.className = "exp-step-item";

    const header = document.createElement("div");
    header.className = "exp-step-header";
    header.textContent = `Langkah ${step.stepNumber}: Hitung ${step.expressionPart}`;

    const reason = document.createElement("div");
    reason.className = "exp-step-reason";
    reason.textContent = step.reason;

    const calc = document.createElement("div");
    calc.className = "exp-step-calc";
    calc.textContent = `${step.expressionPart} = ${step.result}`;

    li.appendChild(header);
    li.appendChild(reason);
    li.appendChild(calc);
    stepsList.appendChild(li);
  });

  explanationContent.appendChild(stepsList);

  // 3. Hasil Akhir
  const finalBox = document.createElement("div");
  finalBox.className = "exp-final";
  finalBox.textContent = `Hasil Akhir: ${explanationData.finalAnswer}`;
  explanationContent.appendChild(finalBox);

  explanationPanel.classList.remove("hidden");
}

function resetQuestionUI(elements) {
  elements.answerInput.value = "";
  elements.feedbackBox.className = "feedback-box hidden";
  elements.feedbackBox.innerHTML = "";
  elements.explanationPanel.className = "explanation-panel hidden";
  elements.explanationContent.innerHTML = "";
  appState.isAnswered = false;
}

/* ==========================================================================
   10. EVENT HANDLERS & INISIALISASI UTAMA
   ========================================================================== */

function handleNextQuestion(elements) {
  resetQuestionUI(elements);
  const newQuestion = generateQuestion(appState.level, appState.questionType);
  appState.currentQuestion = newQuestion;
  renderQuestion(elements, newQuestion);
  elements.answerInput.focus();
}

function handleLevelChange(elements) {
  appState.level = Number(elements.levelSelect.value);
  handleNextQuestion(elements);
}

function handleQuestionTypeChange(elements) {
  appState.questionType = elements.typeSelect.value;
  handleNextQuestion(elements);
}

function handleAnswerSubmit(event, elements) {
  event.preventDefault();
  if (!appState.currentQuestion) return;

  const validationResult = validateAnswer(
    elements.answerInput.value,
    appState.currentQuestion.answer
  );

  renderFeedback(elements, validationResult);

  if (validationResult.status === "invalid") {
    elements.answerInput.focus();
    return;
  }

  appState.isAnswered = true;
  const explanationData = generateExplanation(appState.currentQuestion);
  renderExplanation(elements, explanationData);
}

function setupCustomDropdowns() {
  const dropdowns = document.querySelectorAll(".app-container .custom-dropdown");

  function closeAllDropdowns(exceptDropdown = null) {
    dropdowns.forEach((dropdown) => {
      if (dropdown !== exceptDropdown) {
        dropdown.classList.remove("is-open");
        const trigger = dropdown.querySelector(".dropdown-trigger");
        const menu = dropdown.querySelector(".dropdown-menu");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
        if (menu) menu.classList.add("hidden");
      }
    });
  }

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const selectedTextEl = dropdown.querySelector(".dropdown-selected-text");
    const menu = dropdown.querySelector(".dropdown-menu");
    const options = dropdown.querySelectorAll(".dropdown-option");
    const targetSelectId = dropdown.getAttribute("data-target");
    const hiddenSelect = document.getElementById(targetSelectId);

    if (!trigger || !menu || !hiddenSelect) return;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isCurrentlyOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns(dropdown);

      if (!isCurrentlyOpen) {
        dropdown.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        menu.classList.remove("hidden");
      } else {
        dropdown.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        menu.classList.add("hidden");
      }
    });

    options.forEach((option) => {
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        const chosenValue = option.getAttribute("data-value");
        const chosenLabel = option.textContent.trim();

        options.forEach((opt) => {
          opt.classList.remove("is-selected");
          opt.setAttribute("aria-selected", "false");
        });
        option.classList.add("is-selected");
        option.setAttribute("aria-selected", "true");

        if (selectedTextEl) {
          selectedTextEl.textContent = chosenLabel;
        }

        hiddenSelect.value = chosenValue;
        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));

        closeAllDropdowns();
      });
    });
  });

  document.addEventListener("click", () => {
    closeAllDropdowns();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
  });
}

function initializeQuiz() {
  const elements = getDomElements();

  if (!elements.questionDisplay || !elements.answerForm) {
    console.error("Elemen antarmuka kuis tidak ditemukan pada dokumen HTML.");
    return;
  }

  setupCustomDropdowns();

  appState.level = Number(elements.levelSelect.value) || 1;
  appState.questionType = elements.typeSelect.value || "mixed";

  elements.levelSelect.addEventListener("change", () =>
    handleLevelChange(elements)
  );
  elements.typeSelect.addEventListener("change", () =>
    handleQuestionTypeChange(elements)
  );
  elements.answerForm.addEventListener("submit", (event) =>
    handleAnswerSubmit(event, elements)
  );
  elements.nextBtn.addEventListener("click", () =>
    handleNextQuestion(elements)
  );

  handleNextQuestion(elements);
}

initializeQuiz();
/*export { initializeQuiz };*/
