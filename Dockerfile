FROM mhart/alpine-node:7

EXPOSE 5000

RUN mkdir /src
VOLUME ["/src"]

ENTRYPOINT ["node"]
CMD ["/src/index.js"]
