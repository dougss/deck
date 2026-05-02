import { describe, expect, it } from 'vitest'
import { parseNumstat, parsePorcelainV2, mergeFileChanges } from './git-diff-manager'

describe('parsePorcelainV2', () => {
  it('returns empty for empty input', () => {
    expect(parsePorcelainV2('')).toEqual([])
  })

  it('parses an unstaged modified file', () => {
    // "1 .M N... 100644 100644 100644 hash hash src/foo.ts\0"
    const input = '1 .M N... 100644 100644 100644 abc def src/foo.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([{ path: 'src/foo.ts', status: 'modified', staged: false }])
  })

  it('parses a staged-only added file', () => {
    const input = '1 A. N... 000000 100644 100644 0000 abc src/new.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([{ path: 'src/new.ts', status: 'added', staged: true }])
  })

  it('parses a staged + unstaged modified file', () => {
    const input = '1 MM N... 100644 100644 100644 abc def src/foo.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([
      { path: 'src/foo.ts', status: 'modified', staged: true },
      { path: 'src/foo.ts', status: 'modified', staged: false }
    ])
  })

  it('parses a deleted file', () => {
    const input = '1 .D N... 100644 100644 000000 abc def src/gone.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([{ path: 'src/gone.ts', status: 'deleted', staged: false }])
  })

  it('parses a renamed file with origPath', () => {
    // 2 R. N... 100644 100644 100644 hash hash R100 newPath\0oldPath\0
    const input = '2 R. N... 100644 100644 100644 abc def R100 src/new.ts\0src/old.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([
      { path: 'src/new.ts', oldPath: 'src/old.ts', status: 'renamed', staged: true }
    ])
  })

  it('parses an untracked file', () => {
    const input = '? src/untracked.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toEqual([{ path: 'src/untracked.ts', status: 'untracked', staged: false }])
  })

  it('parses multiple records of mixed types', () => {
    const input =
      '1 .M N... 100644 100644 100644 a b src/foo.ts\0' +
      '1 A. N... 000000 100644 100644 0 c src/new.ts\0' +
      '? src/untracked.ts\0'
    const out = parsePorcelainV2(input)
    expect(out).toHaveLength(3)
    expect(out.map((e) => e.path)).toEqual(['src/foo.ts', 'src/new.ts', 'src/untracked.ts'])
  })
})

describe('parseNumstat', () => {
  it('returns empty for empty input', () => {
    expect(parseNumstat('')).toEqual([])
  })

  it('parses a single text-file entry', () => {
    const input = '12\t3\tsrc/foo.ts\0'
    const out = parseNumstat(input)
    expect(out).toEqual([{ added: 12, deleted: 3, isBinary: false, path: 'src/foo.ts' }])
  })

  it('parses a binary-file entry', () => {
    const input = '-\t-\tassets/logo.png\0'
    const out = parseNumstat(input)
    expect(out).toEqual([{ added: 0, deleted: 0, isBinary: true, path: 'assets/logo.png' }])
  })

  it('parses multiple entries', () => {
    const input = '5\t2\ta.ts\0' + '0\t10\tb.ts\0' + '-\t-\timg.png\0'
    const out = parseNumstat(input)
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ added: 5, deleted: 2, isBinary: false, path: 'a.ts' })
    expect(out[1]).toMatchObject({ added: 0, deleted: 10, isBinary: false, path: 'b.ts' })
    expect(out[2]).toMatchObject({ isBinary: true, path: 'img.png' })
  })

  it('parses a renamed entry (NUL-separated paths)', () => {
    // numstat -z renames: "added\tdeleted\t\0orig\0new\0"
    const input = '4\t2\t\0src/old.ts\0src/new.ts\0'
    const out = parseNumstat(input)
    expect(out).toEqual([
      { added: 4, deleted: 2, isBinary: false, path: 'src/new.ts', oldPath: 'src/old.ts' }
    ])
  })
})

describe('mergeFileChanges', () => {
  it('returns empty for empty inputs', () => {
    expect(mergeFileChanges([], [], [])).toEqual([])
  })

  it('merges porcelain + unstaged numstat for a single file', () => {
    const result = mergeFileChanges(
      [{ path: 'a.ts', status: 'modified', staged: false }],
      [{ path: 'a.ts', added: 5, deleted: 2, isBinary: false }],
      []
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      path: 'a.ts',
      status: 'modified',
      staged: false,
      added: 5,
      deleted: 2,
      isBinary: false
    })
  })

  it('collapses staged + unstaged into one FileChange with staged=true and summed totals', () => {
    const result = mergeFileChanges(
      [
        { path: 'a.ts', status: 'modified', staged: true },
        { path: 'a.ts', status: 'modified', staged: false }
      ],
      [{ path: 'a.ts', added: 3, deleted: 1, isBinary: false }],
      [{ path: 'a.ts', added: 2, deleted: 0, isBinary: false }]
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      path: 'a.ts',
      status: 'modified',
      staged: true,
      added: 5,
      deleted: 1
    })
  })

  it('marks binary if numstat reports binary', () => {
    const result = mergeFileChanges(
      [{ path: 'logo.png', status: 'modified', staged: false }],
      [{ path: 'logo.png', added: 0, deleted: 0, isBinary: true }],
      []
    )
    expect(result[0]).toMatchObject({ path: 'logo.png', isBinary: true })
  })

  it('handles untracked files (no numstat data)', () => {
    const result = mergeFileChanges(
      [{ path: 'new.ts', status: 'untracked', staged: false }],
      [],
      []
    )
    expect(result).toEqual([
      {
        path: 'new.ts',
        oldPath: undefined,
        status: 'untracked',
        staged: false,
        added: 0,
        deleted: 0,
        isBinary: false
      }
    ])
  })

  it('promotes untracked → modified when a non-untracked entry exists for same path', () => {
    const result = mergeFileChanges(
      [
        { path: 'x.ts', status: 'untracked', staged: false },
        { path: 'x.ts', status: 'modified', staged: true }
      ],
      [],
      [{ path: 'x.ts', added: 1, deleted: 0, isBinary: false }]
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ path: 'x.ts', status: 'modified', staged: true })
  })
})
