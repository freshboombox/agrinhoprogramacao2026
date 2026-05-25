// Banco de Dados das Perguntas (5 Níveis)
const questions = [
    {
        question: "1. Você precisa preparar a terra para a próxima safra. Qual técnica protege melhor o solo?",
        options: [
            "Arar a terra profundamente, revolvendo todo o solo.",
            "Usar o Plantio Direto, mantendo a palhada da colheita anterior sobre a terra.",
            "Queimar o resto da plantação antiga para limpar rápido."
        ],
        answer: 1,
        explanation: "O Plantio Direto é essencial! A palhada protege o solo contra o sol forte e a chuva, evitando a erosão e mantendo a umidade na terra."
    },
    {
        question: "2. Uma praga está atacando a lavoura de milho. Como a tecnologia pode ajudar de forma sustentável?",
        options: [
            "Aplicar defensivo em toda a fazenda por precaução.",
            "Deixar a praga comer a lavoura, pois é o ciclo natural.",
            "Usar drones para mapear o foco da praga e aplicar o controle biológico (como vespinhas) apenas onde precisa."
        ],
        answer: 2,
        explanation: "Drones e sensores permitem a 'Agricultura de Precisão'. Você age apenas onde é necessário, economizando recursos e protegendo a natureza."
    },
    {
        question: "3. Há um pequeno rio que cruza a sua propriedade. O que fazer com as margens dele?",
        options: [
            "Manter as Matas Ciliares intactas (ou replantar árvores nativas) nas margens.",
            "Plantar soja até a beira do rio para não perder espaço de lucro.",
            "Fazer um desvio no rio para levar a água direto para a sede da fazenda."
        ],
        answer: 0,
        explanation: "As Matas Ciliares funcionam como os 'cílios' dos nossos olhos: elas protegem o rio da sujeira e da terra que pode desmoronar, garantindo água limpa para todos."
    },
    {
        question: "4. A fazenda produz muitos resíduos animais (esterco). O que você pode fazer com isso?",
        options: [
            "Jogar em um buraco longe da sede.",
            "Instalar um Biodigestor, transformando o esterco em gás para gerar energia e em adubo rico.",
            "Lavar tudo com água e mandar para o rio."
        ],
        answer: 1,
        explanation: "O Biodigestor é pura sustentabilidade! Ele transforma o que seria 'lixo' em energia limpa para a fazenda e fertilizante natural para as plantas."
    },
    {
        question: "5. A chuva tem sido irregular e você precisa irrigar a plantação de forma inteligente. Qual a melhor escolha?",
        options: [
            "Usar um sistema de gotejamento inteligente, controlado pelo celular conforme a umidade da terra.",
            "Ligar a mangueira o dia todo para garantir que fique bem molhado.",
            "Esperar chover, não importando o quanto a planta sofra."
        ],
        answer: 0,
        explanation: "A água é nosso recurso mais precioso. Sistemas inteligentes gotejam a água direto na raiz da planta, na quantidade exata, evitando o desperdício."
    }
];

// Variáveis de Controle
let currentQuestion = 0;
let score = 0;
const pointsPerQuestion = 20;

// Elementos da Tela Inicial e Jogo
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");

// Elementos da Interface do Jogo
const questionText = document.getElementById("question-text");
const optionsDiv = document.getElementById("options");
const scoreDisplay = document.getElementById("score");
const levelDisplay = document.getElementById("level-display");
const progressFill = document.getElementById("progress-fill");

// Elementos de Feedback e Resultado
const feedbackContainer = document.getElementById("feedback-container");
const feedbackTitle = document.getElementById("feedback-title");
const feedbackText = document.getElementById("feedback-text");
const questionContainer = document.getElementById("question-container");

function startGame() {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    currentQuestion = 0;
    score = 0;
    updateScore();
    loadQuestion();
}

function updateScore() {
    scoreDisplay.innerText = score;
    levelDisplay.innerText = currentQuestion + 1;
    // Atualiza a barra de progresso (ex: pergunta 1 de 5 = 20%)
    let progressPercentage = ((currentQuestion) / questions.length) * 100;
    progressFill.style.width = `${progressPercentage}%`;
}

function loadQuestion() {
    feedbackContainer.classList.add("hidden");
    questionContainer.classList.remove("hidden");
    optionsDiv.innerHTML = ""; 
    
    updateScore();
    let q = questions[currentQuestion];
    questionText.innerText = q.question;

    q.options.forEach((opt, index) => {
        let btn = document.createElement("button");
        btn.innerText = opt;
        btn.classList.add("btn");
        btn.onclick = () => selectAnswer(btn, index);
        optionsDiv.appendChild(btn);
    });
}

function selectAnswer(selectedBtn, selectedIndex) {
    // Desabilita todos os botões para não clicar duas vezes
    const allButtons = optionsDiv.querySelectorAll(".btn");
    allButtons.forEach(btn => btn.disabled = true);

    let q = questions[currentQuestion];
    let isCorrect = selectedIndex === q.answer;

    if (isCorrect) {
        selectedBtn.classList.add("correct");
        score += pointsPerQuestion;
        feedbackTitle.innerText = "✅ Escolha Correta!";
        feedbackTitle.style.color = "#2e7d32";
    } else {
        selectedBtn.classList.add("wrong");
        // Mostra qual era a certa
        allButtons[q.answer].classList.add("correct");
        feedbackTitle.innerText = "❌ Escolha Perigosa!";
        feedbackTitle.style.color = "#d32f2f";
    }

    updateScore();
    
    // Mostra o quadro do "Agrinho Explica"
    feedbackText.innerText = q.explanation;
    feedbackContainer.classList.remove("hidden");
}

function nextQuestion() {
    currentQuestion++;

    if (currentQuestion < questions.length) {
        loadQuestion();
    } else {
        showFinalResult();
    }
}

function showFinalResult() {
    gameScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    
    // Atualiza a barra de progresso para 100%
    progressFill.style.width = "100%";
    
    document.getElementById("final-score").innerText = score;
    
    const finalTitle = document.getElementById("final-title");
    const finalMessage = document.getElementById("final-message");

    if (score === 100) {
        finalTitle.innerText = "🏆 Mestre da Sustentabilidade!";
        finalMessage.innerText = "Incrível! Você provou que é possível ter um agronegócio altamente produtivo e em total harmonia com a natureza. O futuro agradece!";
    } else if (score >= 60) {
        finalTitle.innerText = "🌱 Bom Fazendeiro!";
        finalMessage.innerText = "Você está no caminho certo. Algumas práticas podem melhorar, mas a sua fazenda já ajuda o meio ambiente.";
    } else {
        finalTitle.innerText = "⚠️ Alerta Ambiental!";
        finalMessage.innerText = "Suas escolhas visaram mais o lucro rápido e colocaram a fazenda em risco a longo prazo. Vamos tentar novamente e focar na tecnologia verde!";
    }
}

function restartGame() {
    resultScreen.classList.add("hidden");
    startGame();
}
