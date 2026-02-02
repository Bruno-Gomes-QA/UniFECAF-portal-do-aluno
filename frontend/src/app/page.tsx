import { redirect } from "next/navigation";

/**
 * Raiz da aplicação - redireciona para login administrativo
 */
export default function RootPage() {
  redirect("/login/administrativo");
}
