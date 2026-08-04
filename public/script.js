// ==========================================
// VERIFICAR LOGIN
// ==========================================

const token = localStorage.getItem("token");

if (!token) {

    window.location.href = "/login.html";

}


// ==========================================
// DADOS DO USUÁRIO
// ==========================================
const userData = JSON.parse(
    localStorage.getItem("user") || "null"
);

if (userData) {

    const userName =
        document.getElementById("userName");

    const userEmail =
        document.getElementById("userEmail");

    const userAvatar =
        document.getElementById("userAvatar");


    if (userName) {

        userName.textContent =
            userData.name;

    }


    if (userEmail) {

        userEmail.textContent =
            userData.email;

    }


    if (userAvatar) {

        userAvatar.textContent =
            getInitials(userData.name);

    }

}
function getInitials(name) {

    if (!name) return "U";

    const names =
        name.trim().split(/\s+/);

    if (names.length === 1) {

        return names[0]
            .substring(0, 2)
            .toUpperCase();

    }

    return (
        names[0][0] +
        names[names.length - 1][0]
    ).toUpperCase();

}
function toggleUserMenu() {

    const menu =
        document.getElementById("userMenu");

    menu.classList.toggle("active");

}
document.addEventListener("click", function(event) {

    const userArea =
        document.querySelector(".user-area");

    const menu =
        document.getElementById("userMenu");


    if (
        userArea &&
        menu &&
        !userArea.contains(event.target)
    ) {

        menu.classList.remove("active");

    }

});
// ==========================================
// SESSION ID
// ==========================================

let currentSessionId = "";


// ==========================================
// INICIAR PÁGINA
// ==========================================

window.onload = function () {

    startNewChat();

    loadAllChats();

};


// ==========================================
// NOVA CONVERSA
// ==========================================

function startNewChat() {

    currentSessionId =
        "chat-" + crypto.randomUUID();


    const chatbox =
        document.getElementById("chatbox");


    chatbox.innerHTML = "";


    const welcome =
        document.createElement("p");


    welcome.id =
        "welcome-msg";


    welcome.style.textAlign =
        "center";


    welcome.style.color =
        "#80868b";


    welcome.style.fontSize =
        "0.9rem";


    welcome.style.marginTop =
        "20px";


    welcome.textContent =
        "Comece uma nova conversa!";


    chatbox.appendChild(welcome);


    document.getElementById(
        "chat-status"
    ).innerText = "Conversa Ativa";


    hideTyping();

}


// ==========================================
// INDICADOR DIGITANDO
// ==========================================

function showTyping() {

    const bubble =
        document.getElementById(
            "typingBubble"
        );


    if (bubble) {

        bubble.style.display =
            "flex";

    }

}


function hideTyping() {

    const bubble =
        document.getElementById(
            "typingBubble"
        );


    if (bubble) {

        bubble.style.display =
            "none";

    }

}


// ==========================================
// ENVIAR MENSAGEM
// ==========================================

async function sendMessage() {

    const input =
        document.getElementById(
            "userInput"
        );


    const chatbox =
        document.getElementById(
            "chatbox"
        );


    const message =
        input.value.trim();


    if (!message) return;


    // Remove mensagem inicial

    const welcome =
        document.getElementById(
            "welcome-msg"
        );


    if (welcome) {

        welcome.remove();

    }


    // ======================================
    // MENSAGEM DO USUÁRIO
    // ======================================

    const userDiv =
        document.createElement("div");


    userDiv.className =
        "message user";


    userDiv.innerHTML =
        `<b>Você:</b><br>${escapeHtml(message)}`;


    chatbox.appendChild(userDiv);


    input.value = "";


    showTyping();


    try {

        const response =
            await fetch("/chat", {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        localStorage.getItem(
                            "token"
                        )

                },

                body: JSON.stringify({

                    message,

                    sessionId:
                        currentSessionId

                })

            });


        // ==================================
        // TOKEN INVÁLIDO
        // ==================================

        if (response.status === 401) {

            logout();

            return;

        }


        const data =
            await response.json();


        hideTyping();


        // ==================================
        // RESPOSTA DO BOT
        // ==================================

        if (data.reply) {

            const botDiv =
                document.createElement(
                    "div"
                );


            botDiv.className =
                "message bot";


            botDiv.innerHTML =
                `<b>Gemini:</b><br>${escapeHtml(data.reply)}`;


            chatbox.appendChild(
                botDiv
            );


            loadAllChats();


        } else {

            showError(
                data.error ||
                "Erro desconhecido."
            );

        }


    } catch (error) {

        console.error(error);


        hideTyping();


        showError(
            "Conexão falhou."
        );

    }


    chatbox.scrollTop =
        chatbox.scrollHeight;

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}


// ==========================================
// ERRO
// ==========================================

function showError(text) {

    const chatbox =
        document.getElementById(
            "chatbox"
        );


    const error =
        document.createElement(
            "div"
        );


    error.className =
        "message error";


    error.innerHTML =
        `<b>Erro:</b> ${escapeHtml(text)}`;


    chatbox.appendChild(
        error
    );

}


// ==========================================
// LISTAR CONVERSAS
// ==========================================

async function loadAllChats() {

    const historyContent =
        document.getElementById(
            "historyContent"
        );


    try {

        const response =
            await fetch(
                "/historico/lista/sessoes",
                {

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const sessoes =
            await response.json();


        historyContent.innerHTML =
            "";


        if (
            !Array.isArray(sessoes) ||
            sessoes.length === 0
        ) {

            historyContent.innerHTML =
                "<p>Nenhum chat salvo.</p>";

            return;

        }


        sessoes.forEach(
            sessao => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "history-item";


                item.innerText =
                    sessao.titulo ||
                    "Conversa sem título";


                item.onclick =
                    () =>
                        loadSpecificChat(
                            sessao._id
                        );


                historyContent.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(error);

    }

}


// ==========================================
// ABRIR HISTÓRICO
// ==========================================

async function loadSpecificChat(
    sessionId
) {

    currentSessionId =
        sessionId;


    const chatbox =
        document.getElementById(
            "chatbox"
        );


    hideTyping();


    chatbox.innerHTML =
        "<p>Carregando conversa...</p>";


    try {

        const response =
            await fetch(
                `/historico/${sessionId}`,
                {

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const mensagens =
            await response.json();


        chatbox.innerHTML =
            "";


        mensagens.forEach(
            msg => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    msg.role === "user"
                        ? "message user"
                        : "message bot";


                const nome =
                    msg.role === "user"
                        ? "Você"
                        : "Gemini";


                div.innerHTML =
                    `<b>${nome}:</b><br>${escapeHtml(msg.text)}`;


                chatbox.appendChild(
                    div
                );

            }
        );


        chatbox.scrollTop =
            chatbox.scrollHeight;


    } catch (error) {

        console.error(error);


        chatbox.innerHTML =
            "<p>Erro ao carregar mensagens.</p>";

    }

}


// ==========================================
// APAGAR CONVERSA
// ==========================================

async function clearCurrentHistory() {

    if (!currentSessionId) {

        return;

    }


    if (
        !confirm(
            "Deseja apagar esta conversa?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/historico/${currentSessionId}`,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        startNewChat();

        loadAllChats();


    } catch (error) {

        console.error(error);

        showError(
            "Erro ao apagar conversa."
        );

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "sessionId"
    );


    window.location.href =
        "/login.html";

}


// ==========================================
// SIDEBAR
// ==========================================

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebarMenu"
        );


    const overlay =
        document.getElementById(
            "modalOverlay"
        );


    sidebar.classList.toggle(
        "active"
    );


    overlay.classList.toggle(
        "active"
    );

}