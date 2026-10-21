from rest_framework import serializers

TOURS = ["ordens", "nova-ordem", "ordem", "painel", "equipe", "estoque"]


class TourVistoSerializer(serializers.Serializer):
    tour = serializers.ChoiceField(choices=TOURS)


class PrimeirosPassosSerializer(serializers.Serializer):
    escondidos = serializers.BooleanField()
