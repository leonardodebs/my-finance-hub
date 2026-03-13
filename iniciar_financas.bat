@echo off
title My Finance Hub - Inicializador
echo -----------------------------------------
echo    INICIANDO MY FINANCE HUB
echo -----------------------------------------

:: Inicia o servidor backend em uma janela oculta/minimizada
echo [1/3] Iniciando Servidor de Banco de Dados...
start /min "Finance Server" cmd /c "npm run server"

:: Inicia o frontend
echo [2/3] Iniciando Interface do Usuario...
start /min "Finance Web" cmd /c "npm run dev"

:: Aguarda uns segundos para os servicos subirem
echo [3/3] Aguardando inicializacao...
timeout /t 10 /nobreak > nul

:: Abre o sistema no seu navegador padrao
echo Pronto! Abrindo o sistema...
start http://localhost:8080

echo.
echo O sistema esta rodando em segundo plano. 
echo Feche este terminal apenas quando terminar de usar.
pause
