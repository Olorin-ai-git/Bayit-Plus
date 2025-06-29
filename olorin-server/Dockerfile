# https://github.olorin.com/dev-security/debian11-python3-11/blob/master/CHANGELOG.md
FROM docker.olorin.com/dev-security/debian11-python3-11/service/debian11-python3-11:1.26.0 as base
# USER root needed for build, since CPD does not allow root user for gold images.
# Intermediate containers will be discarded at final stage, runtime image will be executed with non root user.
USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN install -d -m 0755 -o appuser -g appuser /app /app/app /app/tmp
WORKDIR /app

FROM base as venv
# Set poetry environment variables first
ENV POETRY_BIN=/opt/poetry/stable/bin
ENV PATH=$POETRY_BIN:$PATH
ENV POETRY=$POETRY_BIN/poetry

# Verify poetry version and set config
RUN poetry --version \
  && poetry config virtualenvs.in-project true --local

# Copy project files and regenerate lock if needed
COPY pyproject.toml poetry.lock* ./
# Force regenerate lock file to match pyproject.toml
RUN poetry lock --no-update
# Then install dependencies
RUN poetry install --without dev,test

FROM venv as test
RUN poetry install
COPY tox.ini mypy.ini .coveragerc ./
COPY app /app/app
ARG APP_ENV=jenkins
ENV APP_ENV=$APP_ENV
RUN poetry run tox
RUN poetry run python -m app.scripts.generate_openapi

FROM base as build
# The following ARG and 2 LABEL are used by Jenkinsfile command
# to identify this intermediate container, for extraction of
# code coverage and other reported values.
ARG build
ARG GIT_BRANCH
ARG GIT_COMMIT
ARG DOCKER_TAGS=latest
ARG WATCHFILES_FORCE_POLLING=false
ENV WATCHFILES_FORCE_POLLING=$WATCHFILES_FORCE_POLLING
# ARG JIRA_PROJECT=https://jira.olorin.com/projects/<CHANGE_ME>
ARG DOCKER_IMAGE_NAME=docker.olorin.com/cas-hri/gaia/service/gaia:${DOCKER_TAGS}
ARG SERVICE_LINK=https://devportal.olorin.com/app/dp/resource/3825825476777495228

LABEL maintainer=some_email@olorin.com \
      app=gaia \
      app-scope=runtime \
      build=${build}

COPY --chown=appuser:appuser --from=venv /app/.venv ./.venv/
COPY --chown=appuser:appuser package/entry.sh /app/entry.sh
COPY --chown=appuser:appuser package/nginx.conf /app/nginx/nginx.conf
COPY --chown=appuser:appuser app /app/app

RUN chown -R appuser:appuser /var/log/nginx

RUN chmod 755 /app/entry.sh \
    && /home/appuser/post_harden.sh
USER appuser

CMD ["/bin/bash", "/app/entry.sh"]
