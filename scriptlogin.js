
      // =====================================================
      // CONFIGURAÇÃO DA API
      // =====================================================

      const API_BASE = "https://portal-infra-backend.onrender.com";


      // =====================================================
      // ALTERNAR ENTRE LOGIN E CADASTRO
      // =====================================================

      function toggleAuth(tela) {

        const loginCard = document.getElementById("form-login");
        const cadastroCard = document.getElementById("form-cadastro");
        const recuperarCard = document.getElementById("form-recuperar");

        // Esconde todas as telas
        loginCard.style.display = "none";
        cadastroCard.style.display = "none";
        recuperarCard.style.display = "none";

        // Mostra a tela escolhida
        if (tela === "login") {
            loginCard.style.display = "block";
        }

        if (tela === "cadastro") {
            cadastroCard.style.display = "block";
        }

        if (tela === "recuperar") {
            recuperarCard.style.display = "block";
        }
    }


      // =====================================================
      // FUNÇÃO PARA ENVIAR JSON PARA O BACKEND
      // =====================================================

      async function postJSON(path, body) {

        const response = await fetch(API_BASE + path, {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(body)

        });


        // Tenta transformar a resposta em JSON
        const data = await response.json().catch(() => ({}));


        // Se o backend retornar erro
        if (!response.ok) {

          throw new Error(
            data.erro ||
            data.message ||
            "Erro na requisição"
          );

        }


        // Retorna os dados recebidos do backend
        return data;

      }


      // =====================================================
      // LOGIN
      // =====================================================

      const loginForm = document.getElementById("login-form");


      loginForm.addEventListener("submit", async function(event) {

        // Impede o HTML de recarregar a página
        event.preventDefault();


        // Pega os valores dos inputs
        const email = document.getElementById("email").value.trim();

        const senha = document.getElementById("senha").value;


        // Verifica se os campos foram preenchidos
        if (!email || !senha) {

          alert("Preencha o e-mail e a senha.");

          return;

        }


        try {

          // Envia para o Spring Boot
          const data = await postJSON(
            "/usuarios/login",
            {
              email: email,
              senha: senha
            }
          );
          localStorage.setItem("usuarioLogado", "true");

          localStorage.setItem(
              "usuario",
              JSON.stringify({
                  id: data.id,
                  nome: data.nome,
                  email: data.email,
                  tipo: data.tipo
              })
          );

          console.log("Login realizado:", data);


          alert(
            "Bem-vindo(a), " +
            (data.nome || data.email || "usuário") +
            "!"
          );


          // Depois podemos colocar aqui a página
          // para onde o usuário será enviado.
          //
          // window.location.href = "index.html";


        } catch (error) {

          console.error("Erro no login:", error);

          alert(error.message);

        }

      });



      // =====================================================
      // CADASTRO
      // =====================================================
        const cadastroForm = document.getElementById("cadastro-form");
      
        const btnEnviarCodigo = document.getElementById("btn-enviar-codigo");

        const cepInput = document.getElementById("cep_cad");
        const cepStatus = document.getElementById("cep-status");
        const telefoneInput = document.getElementById("telefone_cad");

        telefoneInput.addEventListener("input", function () {
        let v = telefoneInput.value.replace(/\D/g, "").slice(0, 11);

        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");   // celular
        } else if (v.length > 6) {
            v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");   // fixo
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (v.length > 0) {
            v = v.replace(/^(\d{0,2}).*/, "($1");
        }

        telefoneInput.value = v;
        });

        cepInput.addEventListener("input", function () {
        let v = cepInput.value.replace(/\D/g, "").slice(0, 8);
        if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
        cepInput.value = v;

        if (v.replace(/\D/g, "").length === 8) buscarCep();
        });

        async function buscarCep() {
        const cep = cepInput.value.replace(/\D/g, "");
        if (cep.length !== 8) return;

        cepStatus.textContent = "Buscando endereço...";
        delete cepStatus.dataset.erro;

        try {
            const resp = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
            const dados = await resp.json();

            if (dados.erro) {
            cepStatus.textContent = "CEP não encontrado. Preencha manualmente.";
            cepStatus.dataset.erro = "";
            return;
            }

            document.getElementById("logradouro_cad").value = dados.logradouro || "";
            document.getElementById("bairro_cad").value = dados.bairro || "";
            document.getElementById("cidade_cad").value = dados.localidade || "";
            document.getElementById("uf_cad").value = dados.uf || "";
            cepStatus.textContent = "";

            document
            .getElementById(dados.logradouro ? "numero_cad" : "logradouro_cad")
            .focus();

        } catch (error) {
            cepStatus.textContent = "Não foi possível consultar o CEP. Preencha manualmente.";
            cepStatus.dataset.erro = "";
        }
        }

        btnEnviarCodigo.addEventListener("click", async function () {
            if (!cadastroForm.reportValidity()) return;

          const email = document.getElementById("email_cad").value.trim();

          if (!email) {
            alert("Digite seu e-mail antes de pedir o código.");
            return;
          }

          btnEnviarCodigo.disabled = true;
          try {
            await postJSON("/usuarios/enviar-codigo", { email });
            document.getElementById("area-verificacao").style.display = "block";
            document.getElementById("cadastro-form").style.display = "none";
            btnEnviarCodigo.textContent = "Reenviar código";
            alert("Código enviado! Verifique seu e-mail.");
          } catch (error) {
            alert(error.message);
          } finally {
            btnEnviarCodigo.disabled = false;
          }
        });

        cadastroForm.addEventListener("submit", async function (event) {
          event.preventDefault();

            const nome = document.getElementById("nome_cad").value.trim();
            const email = document.getElementById("email_cad").value.trim();
            const senha = document.getElementById("senha_cad").value;
            const codigo = document.getElementById("codigo_cad").value.trim();
            const cep = document.getElementById("cep_cad").value.trim();
            const logradouro = document.getElementById("logradouro_cad").value.trim();
            const numero = document.getElementById("numero_cad").value.trim();
            const complemento = document.getElementById("complemento_cad").value.trim();
            const bairro = document.getElementById("bairro_cad").value.trim();
            const cidade = document.getElementById("cidade_cad").value.trim();
            const uf = document.getElementById("uf_cad").value.trim().toUpperCase();
            const telefone = document.getElementById("telefone_cad").value.replace(/\D/g, "");


          if (!nome || !email || !senha || !codigo || !telefone || !cep || !logradouro || !numero || !bairro || !cidade || !uf) {
            alert("Preencha todos os campos, inclusive o código.");
            return;
          }
          if (senha.length < 6) {
            alert("A senha deve ter no mínimo 6 caracteres.");
            return;
          }

          try {
            await postJSON(
                "/usuarios/registration?codigo=" + encodeURIComponent(codigo),
                { nome, email, telefone, senha, cep, logradouro, numero, complemento, bairro, cidade, uf }
            );
          alert("Conta criada com sucesso! Faça login.");
            cadastroForm.reset();
            cadastroForm.style.display = "";                 // volta a mostrar o formulário
            document.getElementById("codigo_cad").value = "";
            cepStatus.textContent = "";
            btnEnviarCodigo.textContent = "Enviar código";
            document.getElementById("area-verificacao").style.display = "none";
            toggleAuth("login");
          } catch (error) {
            alert(error.message);
          }
        });
        document.getElementById("recuperar-form").addEventListener("submit", async function (event) {
          event.preventDefault();
          const email = document.getElementById("email_rec").value.trim();
          try {
            const data = await postJSON("/usuarios/recuperar-senha", { email });
            alert(data.mensagem);
            toggleAuth("login");
          } catch (error) {
            alert(error.message);
          }
        });
