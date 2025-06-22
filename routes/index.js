const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Archivos del servidor Minecraft
const allowlistPath = '/home/mineraft/bedrock-server/bedrock-server/allowlist.json';
const banlistPath = '/home/mineraft/bedrock-server/bedrock-server/ban-list.json';
const logsPath = '/home/mineraft/bedrock-server/bedrock-server/logs/latest.log';
const opsPath = '/home/mineraft/bedrock-server/bedrock-server/ops.json';
const permsPath = '/home/mineraft/bedrock-server/bedrock-server/permissions.json'; 
const propertiesPath = '/home/mineraft/bedrock-server/bedrock-server/server.properties';
const backupsDir = '/home/mineraft/bedrock-server/bedrock-server/backups';
const mensajesPath = '/home/minecraft/minecraft-admin/config/mensajes.json';
const { exec, execFile } = require('child_process');

// RUTA: GET /panel/players → mostrar lista de jugadores permitidos y baneados
router.get('/players', (req, res) => {
  let jugadores = [];
  let baneados = [];
  try { jugadores = JSON.parse(fs.readFileSync(allowlistPath, 'utf8')); } catch {}
  try { baneados = JSON.parse(fs.readFileSync(banlistPath, 'utf8')); } catch {}
  res.render('players', { jugadores, baneados });
});

// RUTA: POST /panel/players/add → agregar nuevo jugador
router.post('/players/add', (req, res) => {
  const { name, ignoresPlayerLimit } = req.body;
  let lista = [];
  try { lista = JSON.parse(fs.readFileSync(allowlistPath, 'utf8')); } catch {}
  if (!lista.find(p => p.name === name)) {
    lista.push({ name, xuid: '', ignoresPlayerLimit: !!ignoresPlayerLimit });
    fs.writeFileSync(allowlistPath, JSON.stringify(lista, null, 2));
  }
  res.redirect('/panel/players');
});

// RUTA: POST /panel/players/edit/:name → editar el parámetro ignoresPlayerLimit
router.post('/players/edit/:name', (req, res) => {
  const name = req.params.name;
  const newVal = req.body.ignoresPlayerLimit === 'true';
  let lista = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  lista = lista.map(p => p.name === name ? { ...p, ignoresPlayerLimit: newVal } : p);
  fs.writeFileSync(allowlistPath, JSON.stringify(lista, null, 2));
  res.redirect('/panel/players');
});

// RUTA: POST /panel/players/kick/:name → ejecutar expulsión desde script
router.post('/players/kick/:name', (req, res) => {
  const player = req.params.name;
  const mensaje = req.body.message || 'Has sido expulsado por un administrador. Vuelve a iniciar sesión.';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'kick_player.sh');

  execFile(scriptPath, [player, mensaje], (error) => {
    if (error) {
      console.error(`Error al expulsar a ${player}:`, error.message);
    }
    res.redirect('/panel/players');
  });
});

// POST para banear (mover a ban-list y expulsar)
router.post('/players/ban/:name', (req, res) => {
    const name = req.params.name;
    let allowlist = [], banlist = [];
    try { allowlist = JSON.parse(fs.readFileSync(allowlistPath)); } catch {}
    try { banlist = JSON.parse(fs.readFileSync(banlistPath)); } catch {}
  
    const jugador = allowlist.find(j => j.name === name);
    if (jugador) {
      banlist.push(jugador);
      allowlist = allowlist.filter(j => j.name !== name);
      fs.writeFileSync(allowlistPath, JSON.stringify(allowlist, null, 2));
      fs.writeFileSync(banlistPath, JSON.stringify(banlist, null, 2));
  
      const scriptPath = path.join(__dirname, '..', 'scripts', 'kick_player.sh');
      const mensaje = "Has sido baneado. Vuelve a iniciar sesión.";
      execFile(scriptPath, [name, mensaje], (err) => {
        if (err) console.error(err);
        res.redirect('/panel/players');
      });
    } else {
      res.redirect('/panel/players');
    }
  });
  
  // POST para desbanear (regresar a allowlist)
  router.post('/players/unban/:name', (req, res) => {
    const name = req.params.name;
    let allowlist = [], banlist = [];
    try { allowlist = JSON.parse(fs.readFileSync(allowlistPath)); } catch {}
    try { banlist = JSON.parse(fs.readFileSync(banlistPath)); } catch {}
  
    const jugador = banlist.find(j => j.name === name);
    if (jugador) {
      allowlist.push(jugador);
      banlist = banlist.filter(j => j.name !== name);
      fs.writeFileSync(allowlistPath, JSON.stringify(allowlist, null, 2));
      fs.writeFileSync(banlistPath, JSON.stringify(banlist, null, 2));
    }
    res.redirect('/panel/players');
  });


// RUTA: GET /panel/players/logs → ver historial de conexiones
router.get('/players/logs', (req, res) => {
  let conexiones = [];
  try {
    const data = fs.readFileSync(logsPath, 'utf8');
    const lineas = data.split('\n');
    conexiones = lineas.filter(linea => linea.includes('Player') && linea.includes('joined'));
  } catch {}
  res.render('logs', { conexiones });
});

// RUTA: GET /panel/players/ops → mostrar operadores
router.get('/players/ops', (req, res) => {
  let ops = [];
  try { ops = JSON.parse(fs.readFileSync(opsPath, 'utf8')); } catch {}
  res.render('ops', { ops });
});


// Mostrar tabla de roles y formulario
router.get('/roles', (req, res) => {
    let permisos = [];
    try {
      permisos = JSON.parse(fs.readFileSync(permsPath, 'utf8'));
    } catch {}
    res.render('roles', { permisos });
  });
  
  // Actualizar rol existente
  router.post('/roles/update', (req, res) => {
    const { name, xuid, permission } = req.body;
    let permisos = [];
    try { permisos = JSON.parse(fs.readFileSync(permsPath, 'utf8')); } catch {}
    permisos = permisos.filter(p => p.xuid !== xuid && p.name !== name);
    permisos.push({ name, xuid, permission });
    fs.writeFileSync(permsPath, JSON.stringify(permisos, null, 2));
    res.redirect('/panel/roles');
  });
  
  // Agregar nuevo jugador con rol
  router.post('/roles/add', (req, res) => {
    const { name, xuid, permission } = req.body;
    let permisos = [];
    try { permisos = JSON.parse(fs.readFileSync(permsPath, 'utf8')); } catch {}
    if (!permisos.find(p => p.name === name || p.xuid === xuid)) {
      permisos.push({ name, xuid, permission });
      fs.writeFileSync(permsPath, JSON.stringify(permisos, null, 2));
    }
    res.redirect('/panel/roles');
  });
  



router.get('/jugabilidad', (req, res) => {
  let config = {};
  try {
    const contenido = fs.readFileSync(propertiesPath, 'utf8');
    contenido.split('\n').forEach(linea => {
      const [clave, valor] = linea.split('=');
      if (clave) config[clave.trim()] = (valor || '').trim();
    });
  } catch (err) {
    console.error('Error al leer server.properties:', err.message);
  }

  res.render('jugabilidad', { config });
});

router.post('/jugabilidad/guardar', (req, res) => {
  const cambios = req.body;

  const limites = {
    'max-players': { min: 1, max: 30 },
    'tick-distance': { min: 4, max: 12 },
    'view-distance': { min: 4, max: 32 },
    'player-idle-timeout': { min: 0, max: 32767 }
  };

  for (const campo in limites) {
    if (cambios[campo]) {
      let valor = parseInt(cambios[campo]);
      const { min, max } = limites[campo];
      if (isNaN(valor)) valor = min;
      if (valor < min) valor = min;
      if (valor > max) valor = max;
      cambios[campo] = valor.toString();
    }
  }

  // Normalizar valores booleanos
  ['pvp', 'allow-nether'].forEach(clave => {
    if (cambios[clave]) {
      const val = cambios[clave].toLowerCase();
      cambios[clave] = (val === 'true' || val === '1') ? 'true' : 'false';
    }
  });

  // Proteger level-name: si está vacío, mantener el actual
  if (!cambios['level-name']) {
    try {
      const contenido = fs.readFileSync(propertiesPath, 'utf8');
      const actual = contenido.split('\n').find(l => l.startsWith('level-name='));
      if (actual) {
        cambios['level-name'] = actual.split('=')[1].trim();
      } else {
        cambios['level-name'] = 'bedrock_server';
      }
    } catch {
      cambios['level-name'] = 'bedrock_server';
    }
  }

  // Validar si el mundo existe físicamente
  const worldPath = path.join('/home/tomas/minecraft/worlds', cambios['level-name']);
  if (!fs.existsSync(worldPath)) {
    console.warn(`⚠ El mundo '${cambios['level-name']}' no existe. Restaurando a 'bedrock_server'.`);
    cambios['level-name'] = 'bedrock_server';
  }

  // Claves válidas a modificar
  const clavesValidas = [
    'difficulty',
    'max-players',
    'tick-distance',
    'view-distance',
    'level-name',
    'server-port',
    'pvp',
    'allow-nether',
    'player-idle-timeout'
  ];

  let lineas = [];

  try {
    const contenido = fs.readFileSync(propertiesPath, 'utf8');
    const existentes = contenido.split('\n');

    lineas = existentes.map(linea => {
      const [clave, valor] = linea.split('=');
      if (clave && clavesValidas.includes(clave.trim()) && cambios[clave.trim()] !== undefined) {
        return `${clave.trim()}=${cambios[clave.trim()]}`;
      }
      return linea;
    });

    // Agregar claves nuevas si no existen
    clavesValidas.forEach(clave => {
      if (!lineas.find(l => l.startsWith(clave + '=')) && cambios[clave] !== undefined) {
        lineas.push(`${clave}=${cambios[clave]}`);
      }
    });

    // Guardar cambios en server.properties
    fs.writeFileSync(propertiesPath, lineas.join('\n'));

    // Ejecutar reinicio con avisos
    const scriptReinicio = path.join(__dirname, '..', 'scripts', 'reiniciar_con_avisos.sh');
    execFile(scriptReinicio, (error) => {
      if (error) {
        console.error('Error al reiniciar con avisos:', error.message);
      }
    });

  } catch (err) {
    console.error('Error al procesar server.properties:', err.message);
  }

  res.redirect('/panel/jugabilidad');
});



// NUEVO PANEL DE CONTROL DEL SERVIDOR
router.get('/server', (req, res) => {
  let mensajes = { bienvenida: '', noticias: '', despedida: '' };
  let backups = [];
  let cronActivo = false;
  let serverEncendido = false;

  try {
    mensajes = JSON.parse(fs.readFileSync(mensajesPath, 'utf8'));
  } catch {}

  try {
    backups = fs.readdirSync(backupsDir).filter(f => f.endsWith('.zip')).sort().reverse();
  } catch {}

  // Comprobación robusta del proceso real
  try {
    const output = require('child_process').execSync("ps -C bedrock_server -o cmd=").toString();
    serverEncendido = output.includes('bedrock_server');
  } catch {
    serverEncendido = false;
  }

  try {
    const cron = require('child_process').execSync('crontab -l').toString();
    cronActivo = cron.includes('backup_manual.sh');
  } catch {}

  res.render('server', { mensajes, backups, cronActivo, serverEncendido });
});


router.post('/server/send-message', (req, res) => {
  const msg = req.body.mensaje?.trim();
  if (!msg) return res.redirect('/panel/server');

  const comando = `screen -S minecraft_server -p 0 -X stuff 'say ${msg.replace(/'/g, "\\'")}\r'`;

  exec(comando, (error, stdout, stderr) => {
    if (error) console.error('[ERROR al enviar mensaje]:', error.message);
    if (stderr) console.error('[STDERR al enviar mensaje]:', stderr);
    res.redirect('/panel/server');
  });
});


router.post('/server/shutdown', (req, res) => {
  exec('bash /home/tomas/minecraft-admin/scripts/apagar_con_avisos.sh', () => {
    res.redirect('/panel/server');
  });
});

router.post('/server/restart', (req, res) => {
  exec('bash /home/tomas/minecraft-admin/scripts/reiniciar_con_avisos.sh', () => {
    res.redirect('/panel/server');
  });
});

router.post('/server/backup', (req, res) => {
  exec('bash /home/tomas/minecraft-admin/scripts/backup_manual.sh', () => {
    res.redirect('/panel/server');
  });
});

router.post('/server/backup-toggle', (req, res) => {
  const habilitar = req.body.habilitar === 'true';
  const cronLinea = '0 0 * * * /home/tomas/minecraft-admin/scripts/backup_manual.sh';

  exec('crontab -l', (err, stdout) => {
    let lineas = stdout.split('\n').filter(l => l.trim() !== '');
    if (habilitar && !lineas.includes(cronLinea)) {
      lineas.push(cronLinea);
    } else if (!habilitar) {
      lineas = lineas.filter(l => l.trim() !== cronLinea);
    }
    const nuevoCrontab = lineas.join('\n') + '\n';
    const child = exec('crontab -');
    child.stdin.write(nuevoCrontab);
    child.stdin.end();
    res.redirect('/panel/server');
  });
});

router.post('/server/restore-backup', (req, res) => {
  const backup = req.body.filename;
  const script = '/home/tomas/minecraft-admin/scripts/restaurar_backup.sh';
  execFile(script, [backup], (error) => {
    if (error) console.error(error);
    res.redirect('/panel/server');
  });
});

router.post('/server/save-messages', (req, res) => {
  const { bienvenida, noticias, despedida } = req.body;
  const contenido = { bienvenida, noticias, despedida };
  fs.writeFile(mensajesPath, JSON.stringify(contenido, null, 2), (err) => {
    if (err) console.error('Error guardando mensajes:', err.message);
    res.redirect('/panel/server');
  });
});


router.post('/server/poweroff', (req, res) => {
  exec('sudo /home/tomas/minecraft-admin/scripts/apagar_pc.sh', () => {
    res.send('La máquina se está apagando...');
  });
});


// Encender el servidor Minecraft
// Encender el servidor Minecraft
// Encender el servidor Minecraft
router.post('/server/start', (req, res) => {
  const comando = 'screen -dmS minecraft_server bash -c "cd /home/tomas/minecraft && mkdir -p logs && LD_LIBRARY_PATH=. ./bedrock_server"';

  require('child_process').exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error('Error al iniciar el servidor:', error.message);
    }
    res.redirect('/panel/server');
  });
});


router.post('/server/stop', (req, res) => {
  const { exec } = require('child_process');
  const mensajes = [
    '⚠ Apagando servidor en 10 segundos...',
    '⚠ Apagando en 9...',
    '⚠ Apagando en 8...',
    '⚠ Apagando en 7...',
    '⚠ Apagando en 6...',
    '⚠ Apagando en 5...',
    '⚠ Apagando en 4...',
    '⚠ Apagando en 3...',
    '⚠ Apagando en 2...',
    '⚠ Apagando en 1...',
    '⛔ Apagando ahora...'
  ];

  mensajes.forEach((msg, i) => {
    setTimeout(() => {
      const comando = `screen -S minecraft_server -p 0 -X stuff "say ${msg}$(printf '\\r')"`;
      exec(comando, (error, stdout, stderr) => {
        if (error) console.error(`Error al enviar: ${msg}`, error);
      });
    }, i * 1000); // Un mensaje cada segundo
  });

  setTimeout(() => {
    const stopCmd = `screen -S minecraft_server -p 0 -X stuff "stop$(printf '\\r')"`;
    exec(stopCmd, (error) => {
      if (error) console.error('Error al apagar el servidor:', error);
    });
  }, mensajes.length * 1000); // Apaga tras 11 segundos

  res.redirect('/panel/server');
});


router.get('/', (req, res) => {
  const script = '/home/tomas/minecraft-admin/scripts/leer_conectados.sh';
  const tempPath = '/tmp/jugadores_activos.txt';

  execFile(script, () => {
    let jugadoresActivos = [];

    try {
      const contenido = fs.readFileSync(tempPath, 'utf8');
      const linea = contenido.trim();

      if (linea.includes(':')) {
        const partes = linea.split(':');
        if (partes[1]) {
          jugadoresActivos = partes[1].split(',').map(j => j.trim()).filter(j => j);
        }
      }
    } catch (e) {
      console.error('No se pudo leer jugadores activos:', e.message);
    }

    res.render('panel', { jugadoresActivos });
  });
});

module.exports = router;
