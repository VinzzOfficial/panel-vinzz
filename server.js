// ===== CONFIG PTERODACTYL =====
const PANEL_URL = "https://panel.domain.com";
const API_KEY = "PTLA_XXXXXXXXXXXXXXXX";
const NODE_ID = 1;
const EGG_ID = 1;
const DOCKER_IMAGE = "ghcr.io/parkervcp/yolks:nodejs_18";

// =============================

app.post("/create-panel", auth, async (req, res) => {
  const { username, ram } = req.body;
  const data = db();
  const reseller = data.accounts.find(a => a.username === req.user);

  if (!username || ram === undefined)
    return res.json({ error: "Invalid input" });

  // ❌ USERNAME SUDAH ADA
  if (data.servers.find(s => s.username === username))
    return res.json({ error: "Username sudah digunakan" });

  // ❌ LIMIT SERVER
  if (reseller.used_server >= reseller.limit_server)
    return res.json({ error: "Limit server habis" });

  // ❌ LIMIT RAM
  if (ram != 0 && reseller.used_ram + parseInt(ram) > reseller.limit_ram)
    return res.json({ error: "Limit RAM tidak cukup" });

  const email = `${username}@gmail.com`;
  const password = `${username}001`;

  // =============================
  // CREATE USER PTERODACTYL
  // =============================
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  const userRes = await fetch(`${PANEL_URL}/api/application/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      username,
      email,
      first_name: username,
      last_name: "panel",
      password
    })
  });

  const userData = await userRes.json();
  if (userData.errors) return res.json(userData);

  // =============================
  // CREATE SERVER
  // =============================
  const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      name: `${username}-server`,
      user: userData.attributes.id,
      egg: EGG_ID,
      docker_image: DOCKER_IMAGE,
      startup: "npm start",
      environment: {},
      limits: {
        memory: ram == 0 ? 0 : parseInt(ram),
        swap: 0,
        disk: 10240,
        io: 500,
        cpu: 0
      },
      feature_limits: {
        databases: 5,
        backups: 5,
        allocations: 1
      },
      deploy: {
        locations: [NODE_ID],
        dedicated_ip: false,
        port_range: []
      }
    })
  });

  const serverData = await serverRes.json();
  if (serverData.errors) return res.json(serverData);

  // =============================
  // SAVE DATABASE
  // =============================
  reseller.used_server += 1;
  if (ram != 0) reseller.used_ram += parseInt(ram);

  data.servers.push({
    username,
    ram,
    owner: reseller.username,
    server_id: serverData.attributes.id
  });

  save(data);

  res.json({
    status: "SUCCESS",
    userna
