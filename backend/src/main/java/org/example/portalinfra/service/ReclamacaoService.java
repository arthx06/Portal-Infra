
package org.example.portalinfra.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.criteria.Predicate;

import org.example.portalinfra.dto.ReclamacaoRequest;
import org.example.portalinfra.dto.ReclamacaoResponse;
import org.example.portalinfra.model.Reclamacao;
import org.example.portalinfra.model.ReclamacaoFoto;
import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.repository.ReclamacaoRepository;
import org.example.portalinfra.repository.UsuarioRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.PageRequest;

import org.springframework.data.domain.Sort;



@Service
public class ReclamacaoService {

    private static final long TAMANHO_MAXIMO = 5L * 1024 * 1024;

    private final Cloudinary cloudinary;
    private final ReclamacaoRepository reclamacaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ComentarioService comentarioService;
    private final GeocodingService geocodingService;


    // Bairros válidos
    private static final java.util.List<String> BAIRROS_VALIDOS = java.util.List.of(
            "Água Rasa",
            "Alto de Pinheiros",
            "Anhanguera",
            "Aricanduva",
            "Artur Alvim",
            "Barra Funda",
            "Bela Vista",
            "Belém",
            "Bom Retiro",
            "Brás",
            "Brasilândia",
            "Butantã",
            "Cachoeirinha",
            "Cambuci",
            "Campo Belo",
            "Campo Grande",
            "Campo Limpo",
            "Cangaíba",
            "Capão Redondo",
            "Carrão",
            "Casa Verde",
            "Cidade Ademar",
            "Cidade Dutra",
            "Cidade Líder",
            "Cidade Tiradentes",
            "Consolação",
            "Cursino",
            "Ermelino Matarazzo",
            "Freguesia do Ó",
            "Grajaú",
            "Guaianases",
            "Iguatemi",
            "Ipiranga",
            "Itaim Bibi",
            "Itaim Paulista",
            "Itaquera",
            "Jabaquara",
            "Jaçanã",
            "Jaguara",
            "Jaguaré",
            "Jaraguá",
            "Jardim Ângela",
            "Jardim Helena",
            "Jardim Paulista",
            "Jardim São Luís",
            "José Bonifácio",
            "Lajeado",
            "Lapa",
            "Liberdade",
            "Limão",
            "Mandaqui",
            "Marsilac",
            "Moema",
            "Mooca",
            "Morumbi",
            "Parelheiros",
            "Pari",
            "Parque do Carmo",
            "Pedreira",
            "Penha",
            "Perdizes",
            "Perus",
            "Pinheiros",
            "Pirituba",
            "Ponte Rasa",
            "Raposo Tavares",
            "República",
            "Rio Pequeno",
            "Sacomã",
            "Santa Cecília",
            "Santana",
            "Santo Amaro",
            "São Domingos",
            "São Lucas",
            "São Mateus",
            "São Miguel",
            "São Rafael",
            "Sapopemba",
            "Saúde",
            "Sé",
            "Socorro",
            "Tatuapé",
            "Tremembé",
            "Tucuruvi",
            "Vila Andrade",
            "Vila Curuçá",
            "Vila Formosa",
            "Vila Guilherme",
            "Vila Jacuí",
            "Vila Leopoldina",
            "Vila Maria",
            "Vila Mariana",
            "Vila Matilde",
            "Vila Medeiros",
            "Vila Prudente",
            "Vila Sônia"
    );

    public ReclamacaoService(
            Cloudinary cloudinary,
            ReclamacaoRepository reclamacaoRepository,
            UsuarioRepository usuarioRepository,
            ComentarioService comentarioService,
            GeocodingService geocodingService) {

        this.cloudinary = cloudinary;
        this.reclamacaoRepository = reclamacaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.comentarioService = comentarioService;
        this.geocodingService = geocodingService;
    }

    
    @Transactional
public ReclamacaoResponse criar(
        ReclamacaoRequest request,
        List<MultipartFile> fotos,
        Long usuarioId) {

    if (fotos == null || fotos.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Envie pelo menos uma foto para a reclamação."
        );
    }

    if (fotos.size() > 3) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Uma reclamação pode ter no máximo 3 fotos."
        );
    }

    for (MultipartFile foto : fotos) {
        if (foto == null || foto.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Uma das fotos enviadas está vazia."
            );
        }

        if (foto.getSize() > TAMANHO_MAXIMO) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cada foto deve ter no máximo 5 MB."
            );
        }

        String contentType = foto.getContentType();

        if (contentType == null ||
                !(contentType.equalsIgnoreCase("image/jpeg") ||
                  contentType.equalsIgnoreCase("image/png"))) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Envie somente imagens JPG ou PNG."
            );
        }

        validarArquivoImagem(foto);
    }

    Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Usuário não encontrado."
            ));

    if (!usuario.isEstaAtivo()) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Esta conta está desativada."
        );
    }

    GeocodingService.Coordenadas coordenadas =
            geocodingService.buscar(
                    request.endereco(),
                    request.bairro()
            ).orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Não foi possível localizar o endereço informado. Verifique o endereço e tente novamente."
            ));

    List<String> urlsEnviadas = new ArrayList<>();

    try {
        Reclamacao reclamacao = new Reclamacao();

        reclamacao.setTitulo(request.titulo());
        reclamacao.setCategoria(request.categoria());
        reclamacao.setDescricao(request.descricao());
        reclamacao.setEndereco(request.endereco());
        reclamacao.setBairro(request.bairro());
        reclamacao.setGravidade(request.gravidade());
        reclamacao.setStatus("Pendente");
        reclamacao.setUsuario(usuario);
        reclamacao.setLatitude(coordenadas.latitude());
        reclamacao.setLongitude(coordenadas.longitude());

        for (int i = 0; i < fotos.size(); i++) {

            MultipartFile foto = fotos.get(i);

            Map resultado = cloudinary.uploader().upload(
                    foto.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "portal-infra/reclamacoes",
                            "resource_type", "image"
                    )
            );

            String fotoUrl = (String) resultado.get("secure_url");

            if (fotoUrl == null || fotoUrl.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Não foi possível obter a URL de uma das imagens."
                );
            }

            urlsEnviadas.add(fotoUrl);

            ReclamacaoFoto reclamacaoFoto = new ReclamacaoFoto();
            reclamacaoFoto.setReclamacao(reclamacao);
            reclamacaoFoto.setUrl(fotoUrl);
            reclamacaoFoto.setOrdem(i);

            reclamacao.getFotos().add(reclamacaoFoto);

            // A primeira foto continua sendo a imagem principal.
            if (i == 0) {
                reclamacao.setFotoUrl(fotoUrl);
            }
        }

        Reclamacao salva = reclamacaoRepository.save(reclamacao);

        return ReclamacaoResponse.de(salva);

    } catch (IOException e) {

        // Remove do Cloudinary as imagens que já foram enviadas
        // caso ocorra uma falha durante o processo.
        for (String url : urlsEnviadas) {
            apagarDoCloudinary(url);
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Erro ao enviar as imagens para o armazenamento."
        );
    }
}



    @Transactional(readOnly = true)
    public Page<ReclamacaoResponse> listarTodas(String titulo, String categoria, String bairro, String status, Pageable pageable) {

        Specification<Reclamacao> spec = (root, query, cb) -> {
            List<Predicate> filtros = new ArrayList<>();

            if (titulo != null && !titulo.isBlank()) {
                filtros.add(cb.like(cb.lower(root.get("titulo")), "%" + titulo.trim().toLowerCase() + "%"));
            }
            if (categoria != null && !categoria.isBlank()) {
                filtros.add(cb.equal(root.get("categoria"), categoria));
            }
            if (bairro != null && !bairro.isBlank()) {
                filtros.add(cb.equal(root.get("bairro"), bairro));
            }
            if (status != null && !status.isBlank()) {
                filtros.add(cb.equal(root.get("status"), status));
            }
            return cb.and(filtros.toArray(new Predicate[0]));
        };

        Pageable ordenado = PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, "dataCriacao").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        return reclamacaoRepository.findAll(spec, ordenado).map(ReclamacaoResponse::de);
    }

    @Transactional(readOnly = true)
    public Page<ReclamacaoResponse> listarPorUsuario(Long usuarioId,  Pageable pageable) {
        return reclamacaoRepository.findByUsuarioIdOrderByDataCriacaoDesc(usuarioId, pageable)
                .map(ReclamacaoResponse::de);
    }


    // ==========================================
    // DELETAR RECLAMAÇÃO (USUÁRIO E ADMIN)
    // ==========================================

    @Transactional
    public void deletarPeloUsuario(Long id, Long usuarioId) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamação não encontrada."));

        // Garante que um usuário não consiga apagar reclamações postadas por outros usuários
        if (!reclamacao.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode apagar suas próprias reclamações.");
        }

        apagarDoCloudinaryEPostgres(reclamacao);
    }

    @Transactional
    public void deletarPeloAdmin(Long id, Long adminId) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamação não encontrada."));

        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado. Apenas administradores podem realizar esta ação.");
        }

        apagarDoCloudinaryEPostgres(reclamacao);
    }

    private void apagarDoCloudinaryEPostgres(Reclamacao reclamacao) {

        // 1. Remove as imagens de todos os comentários e respostas.
        comentarioService.apagarImagensDosComentariosDaReclamacao(reclamacao);

        // 2. Reúne todas as fotos da reclamação, evitando URLs duplicadas.
        Set<String> fotosParaApagar = new LinkedHashSet<>();

        if (reclamacao.getFotoUrl() != null && !reclamacao.getFotoUrl().isBlank()) {
            fotosParaApagar.add(reclamacao.getFotoUrl());
        }

        if (reclamacao.getFotos() != null) {
            for (ReclamacaoFoto foto : reclamacao.getFotos()) {
                if (foto.getUrl() != null && !foto.getUrl().isBlank()) {
                    fotosParaApagar.add(foto.getUrl());
                }
            }
        }

        // 3. Remove todas as imagens da reclamação no Cloudinary.
        for (String url : fotosParaApagar) {
            apagarDoCloudinary(url);
        }

        // 4. Remove a reclamação do PostgreSQL.
        // O cascade da entidade cuidará dos registros relacionados.
        reclamacaoRepository.delete(reclamacao);
    }

  
    @Transactional
    public ReclamacaoResponse atualizarStatus(Long id, String novoStatus, Long adminId) {
        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário solicitante não encontrado."));

        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas administradores podem atualizar o status da reclamação.");
        }

        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamação não encontrada."));

        if (!novoStatus.equals("Pendente") && !novoStatus.equals("Resolvida")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status inválido.");
        }

        reclamacao.setStatus(novoStatus);
        return ReclamacaoResponse.de(reclamacaoRepository.save(reclamacao));
    }


    private void validarArquivoImagem(org.springframework.web.multipart.MultipartFile foto) {
        String contentType = foto.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas arquivos de imagem são permitidos.");
        }

        try {
            BufferedImage image = ImageIO.read(foto.getInputStream());
            if (image == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado é inválido ou foi forjado.");
            }
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao ler o arquivo de imagem.");
        }
    }


    
    @Transactional
    public ReclamacaoResponse editarReclamacao(
            Long id,
            Long usuarioId,
            ReclamacaoRequest request,
            MultipartFile novaFoto) {

        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Reclamação não encontrada."
                ));

        // Verifica se a reclamação pertence ao usuário.
        if (!reclamacao.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você só pode editar suas próprias reclamações."
            );
        }

        if (!BAIRROS_VALIDOS.contains(request.bairro())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bairro inválido selecionado."
            );
        }

        // Verifica se o endereço ou bairro mudou.
        boolean bairroMudou = !java.util.Objects.equals(
                request.bairro(), reclamacao.getBairro()
        );

        boolean enderecoMudou = !java.util.Objects.equals(
                request.endereco(), reclamacao.getEndereco()
        );

        // Atualiza as coordenadas quando necessário.
        if (bairroMudou || enderecoMudou) {

            var coordenadas = geocodingService.buscar(
                    request.endereco(),
                    request.bairro()
            ).orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Não foi possível localizar o novo endereço informado."
            ));

            reclamacao.setLatitude(coordenadas.latitude());
            reclamacao.setLongitude(coordenadas.longitude());
        }

        // Atualiza todos os campos da reclamação.
        reclamacao.setTitulo(request.titulo());
        reclamacao.setCategoria(request.categoria());
        reclamacao.setDescricao(request.descricao());
        reclamacao.setEndereco(request.endereco());
        reclamacao.setBairro(request.bairro());
        reclamacao.setGravidade(request.gravidade());

        // Substitui somente a foto principal, se uma nova foi enviada.
        if (novaFoto != null && !novaFoto.isEmpty()) {

            if (novaFoto.getSize() > TAMANHO_MAXIMO) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A foto deve ter no máximo 5 MB."
                );
            }

            String contentType = novaFoto.getContentType();

            if (contentType == null ||
                    !(contentType.equalsIgnoreCase("image/jpeg") ||
                    contentType.equalsIgnoreCase("image/png"))) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Envie somente imagens JPG ou PNG."
                );
            }

            validarArquivoImagem(novaFoto);

            String fotoAntiga = reclamacao.getFotoUrl();
            String novaFotoUrl;

            try {
                Map resultado = cloudinary.uploader().upload(
                        novaFoto.getBytes(),
                        ObjectUtils.asMap(
                                "folder", "portal-infra/reclamacoes",
                                "resource_type", "image"
                        )
                );

                novaFotoUrl = (String) resultado.get("secure_url");

                if (novaFotoUrl == null || novaFotoUrl.isBlank()) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Não foi possível obter a URL da nova imagem."
                    );
                }

            } catch (IOException e) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Erro ao fazer upload da nova imagem."
                );
            }

            // Localiza a foto principal na coleção.
            ReclamacaoFoto fotoPrincipal = null;

            for (ReclamacaoFoto foto : reclamacao.getFotos()) {
                if (foto.getUrl().equals(fotoAntiga)) {
                    fotoPrincipal = foto;
                    break;
                }
            }

            // Caso não encontre pela URL, procura a foto de menor ordem.
            if (fotoPrincipal == null && !reclamacao.getFotos().isEmpty()) {
                fotoPrincipal = reclamacao.getFotos().get(0);

                for (ReclamacaoFoto foto : reclamacao.getFotos()) {
                    if (foto.getOrdem() < fotoPrincipal.getOrdem()) {
                        fotoPrincipal = foto;
                    }
                }
            }

            // Se ainda não existir registro, cria um.
            if (fotoPrincipal == null) {
                fotoPrincipal = new ReclamacaoFoto();
                fotoPrincipal.setReclamacao(reclamacao);
                fotoPrincipal.setOrdem(0);
                reclamacao.getFotos().add(fotoPrincipal);
            }

            fotoPrincipal.setUrl(novaFotoUrl);

            // Mantém a URL principal sincronizada com a coleção.
            reclamacao.setFotoUrl(novaFotoUrl);

            reclamacaoRepository.saveAndFlush(reclamacao);

            // Só tenta apagar a imagem antiga depois de salvar a nova.
            if (fotoAntiga != null && !fotoAntiga.equals(novaFotoUrl)) {
                apagarDoCloudinary(fotoAntiga);
            }

        } else {
            // Sem foto nova, mantém todas as imagens existentes.
            reclamacaoRepository.save(reclamacao);
        }

        return ReclamacaoResponse.de(reclamacao);
    }


    @Transactional
    public ReclamacaoResponse substituirFoto(
            Long reclamacaoId,
            Long fotoId,
            Long usuarioId,
            MultipartFile novaFoto) {

        // Busca a reclamação.
        Reclamacao reclamacao = reclamacaoRepository.findById(reclamacaoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Reclamação não encontrada."
                ));

        // Verifica se a reclamação pertence ao usuário.
        if (!reclamacao.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você só pode alterar fotos das suas próprias reclamações."
            );
        }

        // Verifica se o arquivo foi enviado.
        if (novaFoto == null || novaFoto.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecione uma nova foto."
            );
        }

        // Valida o tamanho.
        if (novaFoto.getSize() > TAMANHO_MAXIMO) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A foto deve ter no máximo 5 MB."
            );
        }

        // Valida o formato.
        String contentType = novaFoto.getContentType();

        if (contentType == null ||
                !(contentType.equalsIgnoreCase("image/jpeg") ||
                contentType.equalsIgnoreCase("image/png"))) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Envie somente imagens JPG ou PNG."
            );
        }

        validarArquivoImagem(novaFoto);

        // Localiza somente a foto selecionada.
        ReclamacaoFoto fotoSelecionada = reclamacao.getFotos()
                .stream()
                .filter(foto -> foto.getId().equals(fotoId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Foto não encontrada nesta reclamação."
                ));

        String fotoAntiga = fotoSelecionada.getUrl();
        String novaFotoUrl;

        // Envia a nova imagem para o Cloudinary.
        try {
            Map resultado = cloudinary.uploader().upload(
                    novaFoto.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "portal-infra/reclamacoes",
                            "resource_type", "image"
                    )
            );

            novaFotoUrl = (String) resultado.get("secure_url");

            if (novaFotoUrl == null || novaFotoUrl.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Não foi possível obter a URL da nova imagem."
                );
            }

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Erro ao enviar a nova imagem."
            );
        }

        // Verifica se a foto substituída é a principal.
        boolean eraFotoPrincipal =
                java.util.Objects.equals(reclamacao.getFotoUrl(), fotoAntiga);

        // Atualiza somente a foto selecionada.
        fotoSelecionada.setUrl(novaFotoUrl);

        // Mantém a foto principal sincronizada.
        if (eraFotoPrincipal) {
            reclamacao.setFotoUrl(novaFotoUrl);
        }

        // Salva as alterações no banco.
        Reclamacao salva = reclamacaoRepository.saveAndFlush(reclamacao);

        // Apaga a imagem antiga somente depois de salvar a nova.
        if (fotoAntiga != null && !fotoAntiga.equals(novaFotoUrl)) {
            apagarDoCloudinary(fotoAntiga);
        }

        return ReclamacaoResponse.de(salva);
    }

    private void apagarDoCloudinary(String url) {
        if (url == null || url.isBlank()) return;

        int inicio = url.indexOf("portal-infra/reclamacoes/"); // Atualizado para a pasta correta
        int fim = url.lastIndexOf(".");
        if (inicio != -1 && fim != -1) {
            String publicId = url.substring(inicio, fim);
            try {
                cloudinary.uploader().destroy(publicId, com.cloudinary.utils.ObjectUtils.emptyMap());
            } catch (java.io.IOException e) {
                System.err.println("Erro ao deletar imagem da reclamação no Cloudinary: " + e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public ReclamacaoResponse buscarPorId(Long id) {
        return reclamacaoRepository.findById(id)
                .map(ReclamacaoResponse::de)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reclamação não encontrada."));
    }

    @Transactional
    public void deletarReclamacaoPeloAdmin(Long id, Long adminId) {
        deletarPeloAdmin(id, adminId);
    }
    @Transactional
    public Map<String, Integer> geocodificarReclamacoesPendentes(Long adminId) {

    // Verifica se quem solicitou a operação é administrador
    Usuario admin = usuarioRepository.findById(adminId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Administrador não encontrado."
            ));

    if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Apenas administradores podem realizar esta operação."
        );
    }

    // Busca reclamações que ainda não possuem alguma coordenada
    List<Reclamacao> reclamacoes =
            reclamacaoRepository.findByLatitudeIsNullOrLongitudeIsNull();

    int atualizadas = 0;
    int naoLocalizadas = 0;

    for (Reclamacao reclamacao : reclamacoes) {

        var coordenadas = geocodingService.buscar(
                reclamacao.getEndereco(),
                reclamacao.getBairro()
        );

        if (coordenadas.isPresent()) {

            reclamacao.setLatitude(coordenadas.get().latitude());
            reclamacao.setLongitude(coordenadas.get().longitude());

            reclamacaoRepository.save(reclamacao);

            atualizadas++;

        } else {
            naoLocalizadas++;
        }
    }

    return Map.of(
            "totalAnalisadas", reclamacoes.size(),
            "atualizadas", atualizadas,
            "naoLocalizadas", naoLocalizadas
    );
}

}
