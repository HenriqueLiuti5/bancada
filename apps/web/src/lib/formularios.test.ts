import { describe, expect, it } from "vitest";
import { ErroDaApi, mensagemDaApi } from "@/lib/api";
import { estadoDeErro, texto } from "@/lib/formularios";

describe("texto", () => {
  it("lê o campo do formulário sem os espaços das pontas", () => {
    const dados = new FormData();
    dados.set("nome", "  Maria Silva ");
    expect(texto(dados, "nome")).toBe("Maria Silva");
    expect(texto(dados, "ausente")).toBe("");
  });
});

describe("estadoDeErro", () => {
  it("põe cada erro da API embaixo do seu campo, inclusive os aninhados", () => {
    const erro = new ErroDaApi(400, {
      problema_relatado: ["Este campo é obrigatório."],
      cliente_novo: { telefone: ["O DDD 20 não existe."], nome: "Informe o nome." },
    });

    const estado = estadoDeErro(erro, "Não foi possível abrir a ordem.", { problema_relatado: "" });

    expect(estado).toEqual({
      erros: {
        problema_relatado: "Este campo é obrigatório.",
        "cliente_novo.telefone": "O DDD 20 não existe.",
        "cliente_novo.nome": "Informe o nome.",
      },
      valores: { problema_relatado: "" },
      erro: undefined,
    });
  });

  it("mostra no alto do formulário o erro que não é de um campo", () => {
    const geral = new ErroDaApi(400, { non_field_errors: ["Esse e-mail já está em uso."] });
    expect(estadoDeErro(geral, "Não foi possível criar a conta.")).toEqual({
      erros: {},
      valores: {},
      erro: "Esse e-mail já está em uso.",
    });

    const proibido = new ErroDaApi(403, { detail: "A assinatura está suspensa." });
    expect(estadoDeErro(proibido, "Não foi possível salvar.").erro).toBe("A assinatura está suspensa.");
  });

  it("usa a mensagem alternativa quando a API não explica", () => {
    expect(estadoDeErro(new ErroDaApi(500, null), "Não foi possível salvar.").erro).toBe(
      "Não foi possível salvar.",
    );
  });
});

describe("mensagemDaApi", () => {
  it("avisa quando nem chegou a falar com o servidor", () => {
    expect(mensagemDaApi(new TypeError("fetch failed"), "Não foi possível salvar.")).toBe(
      "Não foi possível falar com o servidor.",
    );
  });

  it("acha o primeiro texto no corpo do erro", () => {
    const erro = new ErroDaApi(400, { cobranca: { valor_cobrado: ["Valor inválido."] } });
    expect(mensagemDaApi(erro, "Não foi possível registrar a entrega.")).toBe("Valor inválido.");
  });
});
