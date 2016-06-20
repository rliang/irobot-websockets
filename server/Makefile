PREFIX?=/usr/local

PROGRAM=irobot-server
SERVICE=${PROGRAM}.service

${PREFIX}/bin/${PROGRAM}: index.js package.json ${SERVICE}
	npm install -g
	install -Dm644 ${SERVICE} /lib/systemd/system
	systemctl enable ${SERVICE}
	systemctl restart ${SERVICE}

