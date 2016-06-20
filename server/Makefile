PROGRAM=irobot-server
SERVICE=${PROGRAM}.service

${PREFIX}/bin/${PROGRAM}: index.js package.json ${SERVICE}
	npm install -g
	install -Dm644 ${SERVICE} ${PREFIX}/lib/systemd/system
	systemctl enable ${SERVICE}
	systemctl restart ${SERVICE}

