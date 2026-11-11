import random


# Sorteio sem reposição: cada carta sai uma vez antes de o baralho ser embaralhado de novo. Assim a
# mistura de defeitos, de aparelhos e de movimento de cada mês fica perto da média, e o gráfico do
# lucro de exemplo não depende da sorte de um mês.
class Baralho[T]:
    def __init__(self, cartas: list[T]) -> None:
        self._cartas = list(cartas)
        self._monte: list[T] = []

    def tirar(self) -> T:
        if not self._monte:
            self._monte = random.sample(self._cartas, len(self._cartas))
        return self._monte.pop()
