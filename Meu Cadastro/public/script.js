// ===== FORMATAÇÃO DE CPF =====
function formatCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length > 9) return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else if (cpf.length > 6) return cpf.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    else if (cpf.length > 3) return cpf.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    return cpf;
}

// ===== APLICAÇÃO DE VALIDAÇÃO EM TEMPO REAL =====
function aplicarValidacaoCPF(inputId, feedbackId) {
    const cpfInput = document.getElementById(inputId);
    const cpfFeedback = document.getElementById(feedbackId);
    if (!cpfInput || !cpfFeedback) return;

    const mostrarMensagem = window.location.pathname.includes('/cadastre-se');

    cpfInput.addEventListener("input", async () => {
        cpfInput.value = formatCPF(cpfInput.value);
        const cpfLimpo = cpfInput.value.replace(/\D/g, "");

        if (cpfLimpo.length === 0) {
            if (mostrarMensagem) cpfFeedback.textContent = "";
            cpfInput.classList.remove('is-danger', 'is-success');
        } else if (cpfLimpo.length === 11) {
            // Chamada para validar CPF
            try {
                const res = await fetch('/validar-cpf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf: cpfLimpo })
                });
                const data = await res.json();
                const isValid = data.valido;

                if (isValid) {
                    if (mostrarMensagem) {
                        cpfFeedback.textContent = "CPF válido";
                        cpfFeedback.style.color = "green";
                    }
                    cpfInput.classList.remove('is-danger');
                    cpfInput.classList.add('is-success');
                } else {
                    if (mostrarMensagem) {
                        cpfFeedback.textContent = "CPF inválido";
                        cpfFeedback.style.color = "red";
                    }
                    cpfInput.classList.remove('is-success');
                    cpfInput.classList.add('is-danger');
                }
            } catch (err) {
                console.error('Erro ao validar CPF:', err);
            }
        } else {
            if (mostrarMensagem) cpfFeedback.textContent = "";
            cpfInput.classList.remove('is-danger', 'is-success');
        }
    });
}

// ===== CARREGAMENTO DA TABELA DE PESSOAS =====
async function carregarTabela() {
    const tbody = document.getElementById("tabela-corpo");
    if (!tbody) return;

    try {
        const res = await fetch("/pessoas");
        const pessoas = await res.json();

        tbody.innerHTML = "";

        pessoas.forEach((pessoa) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${pessoa.nome}</td>
                <td>${pessoa.cpf}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro ao carregar tabela:", err);
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", () => {

    // Valida CPF em tempo real
    aplicarValidacaoCPF("cpf_input", "cpf_feedback");

    // LOGIN
    const loginBtn = document.getElementById("login_btn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const cpfInput = document.getElementById("cpf_input");
            const cpf = cpfInput.value.replace(/\D/g, "");
            const feedback = document.getElementById("cpf_feedback");

            // Validar CPF antes de login
            try {
                const res = await fetch('/validar-cpf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf })
                });
                const data = await res.json();
                if (!data.valido) {
                    feedback.style.color = "red";
                    feedback.textContent = "Digite um CPF válido antes de continuar.";
                    cpfInput.classList.add('is-danger');
                    return;
                }
            } catch (err) {
                console.error('Erro ao validar CPF:', err);
                feedback.style.color = "red";
                feedback.textContent = "Erro no servidor. Tente novamente mais tarde.";
                return;
            }

            try {
                const res = await fetch("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ cpf })
                });
                const data = await res.json();

                if (data.sucesso && data.pessoa?.nome) {
                    localStorage.setItem('usuario_nome', data.pessoa.nome);
                    cpfInput.classList.remove('is-danger');
                    cpfInput.classList.add('is-success');
                    setTimeout(() => window.location.href = "/home", 500);
                } else {
                    feedback.style.color = "red";
                    feedback.textContent = data.erro || "Cidadão não encontrado!";
                    cpfInput.classList.add('is-danger');
                }
            } catch (err) {
                console.error('Erro no login:', err);
                feedback.style.color = "red";
                feedback.textContent = "Erro no servidor. Tente novamente mais tarde.";
            }
        });
    }

    // CADASTRO
    const cadastroBtn = document.getElementById("cadastro_btn");
    if (cadastroBtn) {
        cadastroBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const nomeInput = document.getElementById("nome_input");
            const cpfInput = document.getElementById("cpf_input");
            const nome = nomeInput?.value.trim();
            const cpf = cpfInput?.value;
            const cpfFeedback = document.getElementById("cpf_feedback");
            const cadastroFeedback = document.getElementById("cadastro_feedback");

            if (!nome) {
                if (cadastroFeedback) {
                    cadastroFeedback.style.color = "red";
                    cadastroFeedback.textContent = "Por favor, digite seu nome completo.";
                }
                return;
            }

            // Valida CPF
            try {
                const res = await fetch('/validar-cpf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") })
                });
                const data = await res.json();
                if (!data.valido) {
                    if (cpfFeedback) {
                        cpfFeedback.textContent = "Digite um CPF válido antes de continuar.";
                        cpfFeedback.style.color = "red";
                    }
                    if (cadastroFeedback) cadastroFeedback.textContent = "";
                    return;
                }
            } catch (err) {
                console.error('Erro ao validar CPF:', err);
                return;
            }

            try {
                const dadosEnvio = { nome, cpf: cpf.replace(/\D/g, "") };
                const response = await fetch("/cadastre-se", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(dadosEnvio)
                });
                const data = await response.json();

                if (cadastroFeedback) {
                    if (data.sucesso) {
                        alert(`Cadastro realizado com sucesso! Bem-vindo, ${data.pessoa.nome}!`);
                        nomeInput.value = "";
                        cpfInput.value = "";
                        cpfInput.classList.remove('is-success', 'is-danger');
                        if (cpfFeedback) cpfFeedback.textContent = "";
                        cadastroFeedback.textContent = "";
                        if (confirm("Deseja ir para a página de login agora?")) {
                            window.location.href = "/login";
                        }
                    } else {
                        cadastroFeedback.style.color = "red";
                        cadastroFeedback.textContent = data.erro || "Erro ao cadastrar!";
                    }
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                if (cadastroFeedback) {
                    cadastroFeedback.style.color = "red";
                    cadastroFeedback.textContent = "Erro no servidor. Tente novamente mais tarde.";
                }
            }
        });
    }

    // HOME
    if (window.location.pathname === "/home") {
        const nome = localStorage.getItem('usuario_nome');
        if (nome) {
            const titleH1 = document.querySelector('.Title h1');
            if (titleH1) titleH1.textContent = `Seja bem-vindo(a), ${nome}!`;
            carregarTabela();
        } else {
            window.location.href = "/login";
        }

        // PESQUISA NA TABELA
        const searchInput = document.getElementById("searchInput");
        const tabelaCorpo = document.getElementById("tabela-corpo");
        if (searchInput && tabelaCorpo) {
            searchInput.addEventListener("input", function() {
                const filtro = this.value.toLowerCase();
                Array.from(tabelaCorpo.getElementsByTagName("tr")).forEach(row => {
                    const nome = row.cells[0].textContent.toLowerCase();
                    const cpf = row.cells[1].textContent.toLowerCase();
                    row.style.display = (nome.includes(filtro) || cpf.includes(filtro)) ? "" : "none";
                });
            });
        }
    }

    // LOGOUT
    const exitButton = document.getElementById('exit_button');
    if (exitButton) {
        exitButton.addEventListener('click', () => {
            localStorage.removeItem('usuario_nome');
            window.location.href = '/login';
        });
    }
});
