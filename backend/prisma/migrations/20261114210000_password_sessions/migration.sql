-- Sessões: tokenVersion sobe a cada troca de senha e invalida os logins antigos.
-- Senha temporária: mustChangePassword pede para o usuário criar a própria senha.
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
