PREFIX?=/usr

PROGRAM=irobot-controller
SERVICE=${PROGRAM}.service

${PREFIX}/bin/${PROGRAM}: index.js package.json ${SERVICE}
	npm install -g --unsafe-perm
	install -Dm644 ${SERVICE} ${PREFIX}/lib/systemd/system
	systemctl enable ${SERVICE}
	systemctl restart ${SERVICE}
