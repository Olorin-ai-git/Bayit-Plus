import multiprocessing

import uvicorn

from app.service.server import app


def server():
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",  # default host
        port=8090,  # default port
        reload=True,  # equivalent to use_reloader=True
    )
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    srv_proc = multiprocessing.Process(target=server)
    srv_proc.start()
    srv_proc.join()
