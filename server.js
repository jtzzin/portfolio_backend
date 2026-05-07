const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// O CORS permite que nosso frontend (que rodará em outra porta durante o dev) acesse essa API.
app.use(cors());

// Rota de saúde (ping) para usar no UptimeRobot sem gastar limite do GitHub!
app.get('/ping', (req, res) => {
    res.scdend('pong');
});

// Rota principal para fornecer os dados dos projetos para o frontend.
app.get('/api/projects', async (req, res) => {
    try {
        // Lemos o arquivo onde você colocará os links dos seus projetos.
        const projectsFilePath = path.join(__dirname, 'projects.json');
        const projectsData = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));

        const enrichedProjects = [];

        // Para cada projeto no JSON, vamos buscar os detalhes lá no GitHub.
        for (const project of projectsData) {
            // Se tiver um link válido do github, tentamos extrair o usuário e o repositório.
            if (project.github_url && project.github_url.includes('github.com')) {
                const urlParts = project.github_url.split('/');
                const repoName = urlParts.pop();
                const userName = urlParts.pop();

                try {
                    // Consumimos a API do GitHub para pegar nome, descrição, etc.
                    const { data } = await axios.get(`https://api.github.com/repos/${userName}/${repoName}`);
                    
                    enrichedProjects.push({
                        name: data.name,
                        description: data.description || 'Sem descrição.',
                        language: data.language,
                        stars: data.stargazers_count,
                        ...project
                    });
                } catch (error) {
                    console.error(`Erro ao buscar o projeto ${userName}/${repoName} no GitHub`, error.message);
                    // Se falhar a busca, enviamos o básico.
                    enrichedProjects.push({
                        name: repoName || 'Projeto',
                        description: 'Não foi possível carregar os detalhes do GitHub.',
                        ...project
                    });
                }
            } else {
                enrichedProjects.push(project);
            }
        }

        res.json(enrichedProjects);
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro ao carregar os projetos.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
});
