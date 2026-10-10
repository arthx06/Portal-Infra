
document.addEventListener("DOMContentLoaded", function () {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    const botaoEntrar = document.getElementById("btn-entrar");
    const menuUsuario = document.getElementById("user-menu");
    const nomeUsuario = document.getElementById("nome-usuario");
    const botaoMenu = document.getElementById("user-menu-btn");
    const dropdown = document.getElementById("user-dropdown");
    const botaoSair = document.getElementById("btn-sair");

    if (usuarioLogado === "true") {
        if (botaoEntrar) {
            botaoEntrar.style.display = "none";
        }

        if (menuUsuario) {
            menuUsuario.style.display = "block";
        }

        const usuario = JSON.parse(
            localStorage.getItem("usuario") || "{}"
        );

        if (nomeUsuario) {
            nomeUsuario.textContent = usuario.nome || "Minha conta";
        }
    }

    // Abre e fecha o menu
    if (botaoMenu && dropdown) {
        botaoMenu.addEventListener("click", function () {
            const aberto = !dropdown.hidden;
            dropdown.hidden = aberto;
            botaoMenu.setAttribute("aria-expanded", String(!aberto));
        });

        // Fecha o menu ao clicar fora dele
        document.addEventListener("click", function (event) {
            if (!menuUsuario.contains(event.target)) {
                dropdown.hidden = true;
                botaoMenu.setAttribute("aria-expanded", "false");
            }
        });
    }

    // Encerra a sessão
    if (botaoSair) {
        botaoSair.addEventListener("click", function () {
            localStorage.removeItem("usuarioLogado");
            localStorage.removeItem("usuario");

            window.location.href = "index.html";
        });
    }
});


let map;

async function carregarGoogleMaps() {

    try {

        const resposta = await fetch(
            "https://portal-infra-backend.onrender.com/usuarios/config/maps"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar a configuração do Maps.");
        }

        const configuracao = await resposta.json();

        const script = document.createElement("script");

        script.src =
            `https://maps.googleapis.com/maps/api/js?key=${configuracao.apiKey}&loading=async&callback=initMap`;

        script.async = true;

        document.head.appendChild(script);

    } catch (erro) {

        console.error("Erro ao carregar Google Maps:", erro);

    }
}


function initMap() {

    const saoPaulo = {
        lat: -23.5505,
        lng: -46.6333
    };

    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: saoPaulo,
            zoom: 12
        }
    );
}


carregarGoogleMaps();