FROM mhart/alpine-node:7

EXPOSE 5000

RUN mkdir /src
VOLUME ["/src"]

WORKDIR /src
CMD ["/src/index.js"]
