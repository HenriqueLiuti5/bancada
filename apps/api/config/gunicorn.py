# Configuração do gunicorn, que serve a API em produção. O número de processos vem de
# WEB_CONCURRENCY, definido na imagem.

bind = "0.0.0.0:8000"
timeout = 60
max_requests = 1000
max_requests_jitter = 100
control_socket_disable = True
