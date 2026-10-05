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