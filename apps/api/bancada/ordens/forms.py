from django import forms

from bancada.ordens.estados import TransicaoInvalida, pode_ir_de
from bancada.ordens.models import OrdemServico


class OrdemServicoForm(forms.ModelForm):
    class Meta:
        model = OrdemServico
        fields = [
            "tenant",
            "loja",
            "cliente",
            "aparelho",
            "tecnico",
            "status",
            "problema_relatado",
            "diagnostico",
            "laudo",
            "prometida_para",
            "garantia_ate",
        ]

    def clean_status(self) -> str:
        novo: str = self.cleaned_data["status"]
        if not self.instance.pk:
            return novo
        atual = OrdemServico.objects.values_list("status", flat=True).get(pk=self.instance.pk)
        if novo != atual and not pode_ir_de(atual, novo):
            raise forms.ValidationError(str(TransicaoInvalida(atual, novo)))
        return novo
