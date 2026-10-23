from rest_framework import serializers

TOURS = ["ordens", "nova-ordem", "ordem", "painel", "equipe", "estoque", "financeiro"]


class TourVistoSerializer(serializers.Serializer):
    tour = serializers.ChoiceField(choices=TOURS)


class PrimeirosPassosSerializer(serializers.Serializer):
    escondidos = serializers.BooleanField()
