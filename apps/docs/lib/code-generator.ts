import type { ParsedEndpoint } from './types/openapi'

export function generateCurlExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `{${name}}`)}`

  let curl = `curl -X ${endpoint.method} '${url}' \\\n`
  curl += `  -H 'Authorization: Bearer $SALLY_API_KEY' \\\n`
  curl += `  -H 'Content-Type: application/json'`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      curl += ` \\\n  -d '${JSON.stringify(example, null, 2).replace(/\n/g, '\n  ')}'`
    }
  }

  return curl
}

export function generateJavaScriptExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `\${${name}}`)}`

  let code = `const response = await fetch('${url}', {\n`
  code += `  method: '${endpoint.method}',\n`
  code += `  headers: {\n`
  code += `    'Authorization': \`Bearer \${process.env.SALLY_API_KEY}\`,\n`
  code += `    'Content-Type': 'application/json'\n`
  code += `  }`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      code += `,\n  body: JSON.stringify(${JSON.stringify(example, null, 2).replace(/\n/g, '\n    ')})`
    }
  }

  code += `\n})\n\nconst data = await response.json()\nconsole.log(data)`

  return code
}

export function generatePythonExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `{${name}}`)}`

  let code = `import requests\nimport os\n\n`
  code += `url = "${url}"\n`
  code += `headers = {\n`
  code += `    "Authorization": f"Bearer {os.environ['SALLY_API_KEY']}",\n`
  code += `    "Content-Type": "application/json"\n`
  code += `}\n`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      code += `\ndata = ${JSON.stringify(example, null, 2).replace(/\n/g, '\n    ')}\n`
      code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)`
    } else {
      code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`
    }
  } else {
    code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`
  }

  code += `\nprint(response.json())`

  return code
}
