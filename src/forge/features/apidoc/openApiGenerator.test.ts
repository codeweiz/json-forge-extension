import { describe, it, expect } from 'vitest'
import { generateOpenApi, openApiToJson, openApiToYaml } from './openApiGenerator'
import type { Endpoint } from '../../../shared/types'

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: 'ep-1',
    method: 'GET',
    domain: 'example.com',
    path: '/api/users',
    snapshots: [],
    starred: false,
    lastSeen: Date.now(),
    ...overrides,
  }
}

describe('generateOpenApi', () => {
  it('single GET endpoint produces valid OpenAPI 3.0 structure', () => {
    const ep = makeEndpoint({
      snapshots: [
        {
          id: 's1',
          meta: {
            url: 'https://example.com/api/users',
            method: 'GET',
            status: 200,
            headers: {},
            timing: 100,
            timestamp: Date.now(),
            size: 50,
          },
          responseBody: '{"users":[]}',
        },
      ],
    })
    const spec = generateOpenApi([ep])

    expect(spec.openapi).toBe('3.0.0')
    expect(spec.info.title).toBe('API Documentation')
    expect(spec.info.version).toBe('1.0.0')
    expect(spec.paths['/api/users']).toBeDefined()
    expect(spec.paths['/api/users'].get).toBeDefined()
    expect(spec.paths['/api/users'].get.responses['200']).toBeDefined()
    expect(spec.paths['/api/users'].get.responses['200'].content).toBeDefined()
  })

  it('POST endpoint with request body includes requestBody in spec', () => {
    const ep = makeEndpoint({
      method: 'POST',
      path: '/api/users',
      snapshots: [
        {
          id: 's1',
          meta: {
            url: 'https://example.com/api/users',
            method: 'POST',
            status: 201,
            headers: {},
            requestBody: '{"name":"Alice","age":30}',
            timing: 150,
            timestamp: Date.now(),
            size: 80,
          },
          responseBody: '{"id":1,"name":"Alice"}',
        },
      ],
    })
    const spec = generateOpenApi([ep])

    const postItem = spec.paths['/api/users'].post
    expect(postItem).toBeDefined()
    expect(postItem.requestBody).toBeDefined()
    expect(postItem.requestBody!.content['application/json'].schema).toBeDefined()
    const schema = postItem.requestBody!.content['application/json'].schema as Record<string, unknown>
    expect(schema.type).toBe('object')
  })

  it('path with :param generates parameters array', () => {
    const ep = makeEndpoint({
      path: '/api/users/:userId/posts/:postId',
    })
    const spec = generateOpenApi([ep])

    const pathKey = '/api/users/{userId}/posts/{postId}'
    expect(spec.paths[pathKey]).toBeDefined()

    const getItem = spec.paths[pathKey].get
    expect(getItem.parameters).toHaveLength(2)
    expect(getItem.parameters![0].name).toBe('userId')
    expect(getItem.parameters![0].in).toBe('path')
    expect(getItem.parameters![0].required).toBe(true)
    expect(getItem.parameters![1].name).toBe('postId')
  })

  it('endpoint with schema uses schema in response content', () => {
    const customSchema = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    }
    const ep = makeEndpoint({
      schema: customSchema,
      snapshots: [
        {
          id: 's1',
          meta: {
            url: 'https://example.com/api/users',
            method: 'GET',
            status: 200,
            headers: {},
            timing: 50,
            timestamp: Date.now(),
            size: 30,
          },
          responseBody: '{"id":1,"name":"Alice"}',
        },
      ],
    })
    const spec = generateOpenApi([ep])
    const responseContent = spec.paths['/api/users'].get.responses['200'].content
    expect(responseContent!['application/json'].schema).toEqual(customSchema)
  })

  it('multiple endpoints produce multiple paths', () => {
    const ep1 = makeEndpoint({ id: 'ep-1', path: '/api/users', method: 'GET' })
    const ep2 = makeEndpoint({ id: 'ep-2', path: '/api/posts', method: 'POST' })
    const spec = generateOpenApi([ep1, ep2])

    expect(Object.keys(spec.paths)).toHaveLength(2)
    expect(spec.paths['/api/users']).toBeDefined()
    expect(spec.paths['/api/posts']).toBeDefined()
    expect(spec.paths['/api/users'].get).toBeDefined()
    expect(spec.paths['/api/posts'].post).toBeDefined()
  })

  it('empty endpoints array produces valid spec with empty paths', () => {
    const spec = generateOpenApi([])
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.paths).toEqual({})
  })
})

describe('openApiToJson', () => {
  it('returns a valid JSON string', () => {
    const spec = generateOpenApi([makeEndpoint()])
    const jsonStr = openApiToJson(spec)
    const parsed = JSON.parse(jsonStr)
    expect(parsed.openapi).toBe('3.0.0')
    expect(parsed.paths).toBeDefined()
  })
})

describe('openApiToYaml', () => {
  it('contains expected YAML keys', () => {
    const ep = makeEndpoint({
      snapshots: [
        {
          id: 's1',
          meta: {
            url: 'https://example.com/api/users',
            method: 'GET',
            status: 200,
            headers: {},
            timing: 100,
            timestamp: Date.now(),
            size: 50,
          },
          responseBody: '{"id":1}',
        },
      ],
    })
    const spec = generateOpenApi([ep], { title: 'Test API', version: '2.0.0' })
    const yaml = openApiToYaml(spec)

    expect(yaml).toContain('openapi:')
    expect(yaml).toContain('info:')
    expect(yaml).toContain('paths:')
    expect(yaml).toContain('Test API')
    expect(yaml).toContain('2.0.0')
    expect(yaml).toContain('/api/users')
  })
})
