const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const { cadastrar } = require('./controllers/cadastro_controller');
const { login } = require('./controllers/login_controller');
const { Pessoa } = require('./models/pessoa');
const { validarCPF } = require('./services/cpf_service');

const PORT = 3000;

// Função para servir arquivos estáticos
function servirArquivoEstatico(res, caminhoArquivo) {
    fs.readFile(caminhoArquivo, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - Arquivo não encontrado</h1>');
            return;
        }

        // Determinar Content-Type baseado na extensão
        const ext = path.extname(caminhoArquivo).toLowerCase();
        let contentType = 'text/plain';
        
        switch (ext) {
            case '.html': contentType = 'text/html; charset=utf-8'; break;
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'application/javascript; charset=utf-8'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
            case '.gif': contentType = 'image/gif'; break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Função para parsear dados de formulário POST
function parseFormData(req, callback) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const parsedData = querystring.parse(body);
            console.log('=== DADOS PARSEADOS ===');
            console.log('Body raw:', body);
            console.log('Dados parseados:', parsedData);
            callback(null, parsedData);
        } catch (error) {
            console.error('Erro ao parsear dados:', error);
            callback(error, null);
        }
    });
}

// Função para parsear dados JSON
function parseJSONData(req, callback) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const parsedData = JSON.parse(body);
            console.log('=== JSON PARSEADO ===');
            console.log('Dados JSON:', parsedData);
            callback(null, parsedData);
        } catch (error) {
            console.error('Erro ao parsear JSON:', error);
            callback(error, null);
        }
    });
}

// Criar servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    console.log(`${method} ${pathname}`);

    // ====== ROTAS DE PÁGINAS (GET) ======
    if (method === 'GET') {
         if (pathname === '/pessoas') {
            const arquivoPessoas = path.join(__dirname, 'banco_de_dados', 'pessoas.json');
            fs.readFile(arquivoPessoas, 'utf-8', (err, data) => {
                if (err) {
                    console.error('Erro ao ler arquivo de pessoas:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ erro: 'Não foi possível ler os dados' }));
                    return;
                }
                const pessoasArray = JSON.parse(data);
                const pessoas = pessoasArray.map(p => ({ nome: p.nome, cpf: p.cpf }));
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(pessoas));
            });
            return; // importante para não cair no default
        }
        switch (pathname) {
            case '/':
            case '/login':
                servirArquivoEstatico(res, path.join(__dirname, 'views', 'Login_Page','index.html'));
                break;
                
            case '/cadastre-se':
                servirArquivoEstatico(res, path.join(__dirname, 'views', 'Register_Page','index.html'));
                break;
            case '/home':
                servirArquivoEstatico(res, path.join(__dirname, 'views', 'Home_page','index.html'));
                break;
                
            default:
                // Servir arquivos estáticos da pasta public
                if (pathname.startsWith('/public/')) {
                    const caminhoArquivo = path.join(__dirname, pathname);
                    servirArquivoEstatico(res, caminhoArquivo);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 - Página não encontrada</h1>');
                }
                break;
        }
    }
    
    // ====== ROTA DE VALIDAÇÃO DE CPF (POST) ======
    else if (method === 'POST' && pathname === '/validar-cpf') {
        parseJSONData(req, (err, dados) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ valido: false, erro: 'JSON inválido' }));
                return;
            }

            try {
                const { cpf } = dados;
                console.log('Validação CPF - CPF recebido:', cpf);

                if (!cpf) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ valido: false, erro: 'CPF não fornecido' }));
                    return;
                }

                // Usa o cpf_service para validar
                const valido = validarCPF(cpf);
                
                console.log('Resultado da validação:', valido);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    valido: valido,
                    cpf: cpf
                }));

            } catch (error) {
                console.error('Erro ao validar CPF:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    valido: false, 
                    erro: 'Erro interno do servidor' 
                }));
            }
        });
    }
    
    // ====== ROTA DE LOGIN (POST) ======
    else if (method === 'POST' && pathname === '/login') {
        parseFormData(req, (err, dados) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ erro: 'Erro ao processar dados' }));
                return;
            }

            try {
                const { cpf } = dados;
                console.log('Login - CPF recebido:', cpf);

                if (!cpf) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ sucesso: false, erro: 'CPF não fornecido' }));
                    return;
                }

                const resultado = login(cpf);

                if (resultado === 'Cidadão não encontrado no sistema') {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ sucesso: false, erro: resultado }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        sucesso: true,
                        mensagem: 'Login realizado com sucesso!',
                        pessoa: {
                            nome: resultado.get_nome(),  // pega o nome do usuário
                            cpf: resultado.get_cpf()     
                        }
                    }));
                }

            } catch (error) {
                console.error('Erro no login:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ sucesso: false, erro: 'Erro no servidor' }));
            }
        });
    }
    
    // ====== ROTA DE CADASTRO (POST) ======
    else if (method === 'POST' && pathname === '/cadastre-se') {
        parseFormData(req, (err, dados) => {
            if (err) {
                console.error('Erro ao parsear dados do formulário:', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    sucesso: false, 
                    erro: 'Erro ao processar dados do formulário' 
                }));
                return;
            }

            try {
                const { nome, cpf } = dados;

                // ===== DEBUG - VERIFICAR DADOS RECEBIDOS =====
                console.log('=== DADOS RECEBIDOS NO CADASTRO ===');
                console.log('Nome:', nome);
                console.log('CPF:', cpf);
                console.log('Dados completos:', dados);

                // Validações básicas
                if (!nome || !cpf) {
                    console.log('Dados faltando - Nome ou CPF vazios');
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        sucesso: false,
                        erro: 'Nome e CPF são obrigatórios'
                    }));
                    return;
                }

                if (nome.trim() === '' || cpf.trim() === '') {
                    console.log('Dados vazios após trim');
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        sucesso: false,
                        erro: 'Nome e CPF não podem estar vazios'
                    }));
                    return;
                }

                // Chamar o controller de cadastro
                console.log('Chamando controller de cadastro...');
                const pessoa = cadastrar(cpf, nome.trim());

                console.log('Resultado do cadastro:', pessoa);

                // Resposta de sucesso
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    sucesso: true,
                    pessoa: {
                        nome: pessoa.get_nome(),
                        cpf: pessoa.get_cpf()
                    },
                    mensagem: `Cadastro realizado com sucesso! Bem-vindo, ${pessoa.get_nome()}`
                }));

            } catch (error) {
                console.error('Erro no cadastro:', error.message);

                // Resposta de erro
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    sucesso: false,
                    erro: error.message || 'Erro ao cadastrar pessoa'
                }));
            }
        });
    }
    
    // ====== ROTA NÃO ENCONTRADA ======
    else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = server;