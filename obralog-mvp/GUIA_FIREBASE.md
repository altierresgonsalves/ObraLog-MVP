# Guia de Configuração do Firebase para ObraLog

Para transformar o ObraLog em um aplicativo real com login e banco de dados, precisamos conectá-lo ao Google Firebase.

## 1. Criar o Projeto
1. Acesse [console.firebase.google.com](https://console.firebase.google.com/).
2. Clique em **Adicionar projeto**.
3. Nome: `ObraLog-MVP` (ou o nome que preferir).
4. Desative o Google Analytics por enquanto.
5. Clique em **Criar projeto**.

## 2. Registrar o App Web e Pegar as Chaves
1. Na tela inicial do projeto, clique no ícone **Web** (`</>`).
2. Apelido do app: `ObraLog Web`.
3. Marque a opção **"Also set up Firebase Hosting"** (Hospedagem do Firebase).
4. Clique em **Registrar app**.
5. Copie o objeto `firebaseConfig` que aparecerá na tela. Ele se parece com isso:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "obralog-mvp.firebaseapp.com",
     projectId: "obralog-mvp",
     storageBucket: "obralog-mvp.firebasestorage.app",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   **Cole essas chaves no chat com a IA.**

## 3. Criar o Banco de Dados (Firestore)
1. No menu lateral esquerdo, vá em **Criação (Build) > Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha uma localização (ex: `nam5 (us-central)` ou `southamerica-east1` se disponível).
4. Em Regras de Segurança, selecione **Iniciar no modo de teste** (Start in Test Mode).
   * *Isso é crucial para o desenvolvimento inicial funcionar sem erros de permissão.*
5. Clique em **Criar**.

## 4. Ativar Login (Authentication)
1. No menu lateral, vá em **Criação (Build) > Authentication**.
2. Clique em **Começar agora**.
3. Na aba *Sign-in method*, clique em **E-mail/Senha**.
4. Ative a primeira opção (**Ativar**) e clique em **Salvar**.

---
Assim que você completar esses passos e me enviar o `firebaseConfig`, eu irei:
1. Instalar o SDK do Firebase no código.
2. Configurar a tela de Login Real.
3. Migrar seus dados locais para a nuvem.
