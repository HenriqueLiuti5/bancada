import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAMANHO_MAXIMO_DA_FOTO_EM_MB, fotoPassaDoTamanho } from "@/lib/fotos";
import { problemaDoTelefone } from "@/lib/telefone";
import { VERSAO_DOS_TEXTOS_LEGAIS } from "@/lib/textosLegais";

// Valores que o site e a API repetem, cada um no seu código, e que precisam mudar juntos.

function codigoDaApi(caminho: string): string {
  const arquivo = new URL(`../../../api/bancada/${caminho}`, import.meta.url);
  return readFileSync(arquivo, "utf-8").replaceAll("\r\n", "\n");
}

function dddsDaApi(): number[] {
  const bloco = /^DDDS_DO_BRASIL = frozenset\(\n([\s\S]+?)\n\)$/m.exec(codigoDaApi("core/telefones.py"))?.[1];
  if (!bloco) throw new Error("DDDS_DO_BRASIL não aparece em apps/api/bancada/core/telefones.py");

  const ddds: number[] = [];
  for (const [, de, ate] of bloco.matchAll(/range\((\d+), (\d+)\)/g)) {
    for (let ddd = Number(de); ddd < Number(ate); ddd += 1) ddds.push(ddd);
  }
  for (const [, lista] of bloco.matchAll(/\[([\d, ]+)\]/g)) ddds.push(...lista.split(",").map(Number));
  return ddds.sort((um, outro) => um - outro);
}

function dddsDoSite(): number[] {
  const ddds: number[] = [];
  for (let ddd = 10; ddd <= 99; ddd += 1) {
    if (problemaDoTelefone(`${ddd}912345678`) === null) ddds.push(ddd);
  }
  return ddds;
}

function valorNaApi(caminho: string, padrao: RegExp): string {
  const encontrado = padrao.exec(codigoDaApi(caminho));
  if (!encontrado) throw new Error(`${padrao} não aparece em apps/api/bancada/${caminho}`);
  return encontrado[1];
}

describe("o site e a API combinam", () => {
  it("nos DDDs aceitos no telefone", () => {
    expect(dddsDoSite()).toHaveLength(67);
    expect(dddsDoSite()).toEqual(dddsDaApi());
  });

  it("na versão dos termos gravada no cadastro", () => {
    const daApi = valorNaApi("tenants/contas.py", /^VERSAO_DOS_TERMOS = "(.+)"$/m);
    expect(VERSAO_DOS_TEXTOS_LEGAIS).toBe(daApi);
  });

  it("no tamanho máximo da foto", () => {
    const daApi = valorNaApi("ordens/fotos.py", /^TAMANHO_MAXIMO_EM_BYTES = (\d+) \* MEGABYTE$/m);
    expect(TAMANHO_MAXIMO_DA_FOTO_EM_MB).toBe(Number(daApi));

    const megabyte = 1024 * 1024;
    const noLimite = new File([new Uint8Array(TAMANHO_MAXIMO_DA_FOTO_EM_MB * megabyte)], "foto.jpg");
    const passando = new File([new Uint8Array(TAMANHO_MAXIMO_DA_FOTO_EM_MB * megabyte + 1)], "foto.jpg");
    expect(fotoPassaDoTamanho(noLimite)).toBe(false);
    expect(fotoPassaDoTamanho(passando)).toBe(true);
  });
});
