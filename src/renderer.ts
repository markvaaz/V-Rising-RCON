import AnsiToHtmlConverter from "./utils/ansi-converter.js";

class Command {
  constructor(
    public name: string,
    public description: string,
    public usage: string[],
    public action: (...args: any[]) => void = () => { }
  ) { }
}

const DOM_ELEMENTS = {
  connectBtn: document.getElementById('connect') as HTMLButtonElement,
  commandInput: document.getElementById('command') as HTMLInputElement,
  output: document.getElementById('output') as HTMLDivElement,
  suggestionElement: document.getElementById('suggestion') as HTMLSpanElement,
  hostInput: document.getElementById('host') as HTMLInputElement,
  portInput: document.getElementById('port') as HTMLInputElement,
  passwordInput: document.getElementById('password') as HTMLInputElement
};

if (localStorage.getItem('history') === null) {
  localStorage.setItem('history', JSON.stringify([]));
}

if (localStorage.getItem('animation') === null) {
  localStorage.setItem('animation', JSON.stringify(true));
}

const APP_STATE = {
  history: [] as string[],
  availableCommands: [] as Command[],
  currentHistoryIndex: 0,
  lastInputValue: '',
  tempInput: '',
  isConnected: false,
  animation: true,
  clientCommands: createClientCommands()
};

function setupEventListeners() {
  DOM_ELEMENTS.connectBtn.addEventListener('click', handleConnect);
  DOM_ELEMENTS.commandInput.addEventListener('input', handleAutocomplete);
  DOM_ELEMENTS.commandInput.addEventListener('keydown', handleCommandKeyDown);
}

function handleCommandKeyDown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault();
    completeCommand();
  }
  handleCommandInput(e);
}

async function handleConnect() {
  if (APP_STATE.isConnected) {
    await window.electronAPI.rconDisconnect();
    return;
  }

  await handleConnectToServer();
}

async function handleConnectToServer() {
  const { hostInput, portInput, passwordInput } = DOM_ELEMENTS;
  const host = hostInput.value;
  const port = parseInt(portInput.value);
  const password = passwordInput.value;

  const result = await window.electronAPI.rconConnect(host, port, password);

  if (result.success) {
    APP_STATE.availableCommands = [...APP_STATE.clientCommands, ...await getAvailableCommands()];
    DOM_ELEMENTS.commandInput.disabled = false;
    DOM_ELEMENTS.commandInput.placeholder = 'Enter command...';
    DOM_ELEMENTS.connectBtn.textContent = 'Disconnect';
    APP_STATE.isConnected = true;
    appendOutput(`Connected to RCON server ${host}:${port}`);
  } else {
    appendOutput(`Connection failed: ${result.message}`);
  }
}

async function sendCommand() {
  const command = DOM_ELEMENTS.commandInput.value;
  const result = await window.electronAPI.rconCommand(command);

  if (result.success) {
    const response = AnsiToHtmlConverter(result.response!);
    appendOutput(`&gt; <span class="command">${command}</span>\n${response}`);
  } else {
    appendOutput(`Command failed: ${result.message}`);
  }
}

function handleCommandInput(event: KeyboardEvent) {
  if (event.key === 'Backspace' || event.key === 'Delete') {
    setTimeout(handleAutocomplete, 0);
    return;
  }

  switch (event.key) {
    case 'Enter':
      handleCommandExecution();
      break;
    case 'ArrowUp':
      navigateHistoryUp();
      event.preventDefault();
      break;
    case 'ArrowDown':
      navigateHistoryDown();
      event.preventDefault();
      break;
  }
}

function handleCommandExecution() {
  DOM_ELEMENTS.suggestionElement.textContent = '';
  const fullCommand = DOM_ELEMENTS.commandInput.value.trim();

  if (fullCommand === '') return;

  const commandName = fullCommand.split(' ')[0];
  const args = fullCommand.split(' ').slice(1);

  if (fullCommand.startsWith(':')) {
    APP_STATE.clientCommands.find(cmd => cmd.name === commandName)?.action(...args);
  } else {
    sendCommand();
  }

  APP_STATE.history.push(fullCommand);
  APP_STATE.currentHistoryIndex = APP_STATE.history.length;
  APP_STATE.tempInput = '';

}

function navigateHistoryUp() {
  if (APP_STATE.currentHistoryIndex === APP_STATE.history.length) {
    APP_STATE.tempInput = DOM_ELEMENTS.commandInput.value;
  }

  if (APP_STATE.currentHistoryIndex > 0) {
    APP_STATE.currentHistoryIndex--;
    DOM_ELEMENTS.commandInput.value = APP_STATE.history[APP_STATE.currentHistoryIndex];
  }
}

function navigateHistoryDown() {
  if (APP_STATE.currentHistoryIndex < APP_STATE.history.length - 1) {
    APP_STATE.currentHistoryIndex++;
    DOM_ELEMENTS.commandInput.value = APP_STATE.history[APP_STATE.currentHistoryIndex];
  } else if (APP_STATE.currentHistoryIndex === APP_STATE.history.length - 1) {
    APP_STATE.currentHistoryIndex++;
    DOM_ELEMENTS.commandInput.value = APP_STATE.tempInput;
  }
}

function handleAutocomplete() {
  const input = DOM_ELEMENTS.commandInput.value;
  if (input === APP_STATE.lastInputValue) return;
  APP_STATE.lastInputValue = input;

  if (!input) {
    DOM_ELEMENTS.suggestionElement.textContent = '';
    return;
  }

  const matchingCommand = APP_STATE.availableCommands.find(cmd =>
    cmd.name.toLowerCase().startsWith(input.toLowerCase())
  );

  if (matchingCommand && matchingCommand.name.toLowerCase() !== input.toLowerCase()) {
    DOM_ELEMENTS.suggestionElement.textContent = matchingCommand.name;
  } else {
    DOM_ELEMENTS.suggestionElement.textContent = '';
  }
}

function completeCommand() {
  const input = DOM_ELEMENTS.commandInput.value;
  const matchingCommand = APP_STATE.availableCommands.find(cmd =>
    cmd.name.toLowerCase().startsWith(input.toLowerCase())
  );

  if (matchingCommand) {
    DOM_ELEMENTS.commandInput.value = matchingCommand.name;
    DOM_ELEMENTS.suggestionElement.textContent = '';
    DOM_ELEMENTS.commandInput.setSelectionRange(
      DOM_ELEMENTS.commandInput.value.length,
      DOM_ELEMENTS.commandInput.value.length
    );
  }
}

function appendOutput(text: string) {
  const lines = text.split('\n');
  let i = 0;

  function loop() {
    if (i >= lines.length) return;
    insertLine(lines[i]);
    i++;
    setTimeout(loop, 5);
  }

  function insertLine(text: string) {
    const span = document.createElement('span');
    span.className = "animated";
    span.innerHTML = text;
    DOM_ELEMENTS.output.appendChild(span);
    DOM_ELEMENTS.output.appendChild(document.createElement('br'));
    DOM_ELEMENTS.output.scrollTop = DOM_ELEMENTS.output.scrollHeight;
  }

  if (APP_STATE.animation) {
    loop();
  } else {
    for (const line of lines) {
      insertLine(line);
    }
  }

  DOM_ELEMENTS.commandInput.value = '';
}

async function getAvailableCommands(): Promise<Command[]> {
  const stripAnsi = (input: string) => input.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const response = await window.electronAPI.rconCommand('help');
  const commands: Command[] = [];

  if (!response.success) {
    return commands;
  }

  const commandListResponse = stripAnsi(response.response!);
  const lines = commandListResponse.split('\n').filter(line => line.trim() !== '');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    const name = line.substring(2, colonIndex).trim();
    const rest = line.substring(colonIndex + 1).trim();

    const dashIndex = rest.lastIndexOf(' - ');
    let [usagePart, description] = dashIndex >= 0
      ? [rest.substring(0, dashIndex).trim(), rest.substring(dashIndex + 3).trim()]
      : ['', rest];

    const usageParams = Array.from(usagePart.matchAll(/<([^>]+)>/g))
      .map(match => `<${match[1]}>`);

    commands.push(new Command(name, description, usageParams));
  }

  return commands;
}

function createClientCommands() {
  const commands: Command[] = [];

  commands.push(new Command(':animation', 'Enable/disable animation', ['true', 'false'], (arg: string) => {
    if (!arg) {
      appendOutput(`&gt; <span class="command">:animation</span>\nInvalid arguments for command ':animation'. try:\n<span class='ansi-fg-bright-black'>:animation &lt;true|false&gt;</span>`);
      return;
    }

    const enable = arg === 'true';
    localStorage.setItem('animation', JSON.stringify(enable));
    APP_STATE.animation = enable;
    appendOutput(`Animation ${enable ? 'enabled' : 'disabled'}`);
  }));

  commands.push(new Command(':clear', 'Clears the console', [], () => {
    DOM_ELEMENTS.output.innerHTML = '';
    DOM_ELEMENTS.commandInput.value = '';
  }));

  commands.push(new Command(':exit', 'Disconnects from the server', [], () => {
    window.close();
  }));

  return commands;
}

function setupResizeObserver() {
  const resizeObserver = new ResizeObserver(() => {
    const { scrollTop, scrollHeight, clientHeight } = DOM_ELEMENTS.output;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < 20) {
      DOM_ELEMENTS.output.scrollTop = scrollHeight;
    }
  });

  resizeObserver.observe(DOM_ELEMENTS.output);
}

window.electronAPI.onRconDisconnected(() => {
  DOM_ELEMENTS.commandInput.disabled = true;
  DOM_ELEMENTS.commandInput.placeholder = 'Please connect to a server';
  DOM_ELEMENTS.connectBtn.disabled = false;
  DOM_ELEMENTS.connectBtn.innerHTML = 'Connect';
  APP_STATE.isConnected = false;
  appendOutput('Disconnected from RCON server');
});

setupEventListeners();
setupResizeObserver();