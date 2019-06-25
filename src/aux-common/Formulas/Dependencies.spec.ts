import {
    Dependencies,
    AuxScriptMemberDependency,
    AuxScriptExpressionDependencies,
    AuxScriptFunctionDependency,
    AuxScriptFileDependency,
    AuxScriptSimpleFunctionDependency,
    AuxScriptReplacements,
    AuxScriptSimpleMemberDependency,
} from './Dependencies';

describe('Dependencies', () => {
    let dependencies: Dependencies;
    beforeEach(() => {
        dependencies = new Dependencies();
    });

    describe('dependencyTree()', () => {
        const cases = [
            ['@ expressions', 'file', '@'],
            ['# expressions', 'tag', '#'],
        ];

        describe.each(cases)('%s', (desc, type, symbol) => {
            it(`should return the tags`, () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag().num + ${symbol}other().num`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'num',
                            object: {
                                type: type,
                                name: 'tag',
                                dependencies: [],
                            },
                        },
                        {
                            type: 'member',
                            identifier: 'num',
                            object: {
                                type: type,
                                name: 'other',
                                dependencies: [],
                            },
                        },
                    ],
                });
            });

            it('should support dots in tag names', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag.test().num`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'num',
                            object: {
                                type: type,
                                name: 'tag.test',
                                dependencies: [],
                            },
                        },
                    ],
                });
            });

            it('should contain the simple arguments used in the expression', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag("hello, world", 123)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'tag',
                            dependencies: [
                                {
                                    type: 'literal',
                                    value: 'hello, world',
                                },
                                {
                                    type: 'literal',
                                    value: 123,
                                },
                            ],
                        },
                    ],
                });
            });

            it('should contain the complex arguments used in the expression', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag(x => x.indexOf("hi") >= 0)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'tag',
                            dependencies: [
                                {
                                    type: 'expression',
                                    dependencies: [
                                        {
                                            type: 'call',
                                            identifier: {
                                                type: 'member',
                                                identifier: 'indexOf',
                                                object: {
                                                    type: 'member',
                                                    identifier: 'x',
                                                    object: null,
                                                },
                                            },
                                            dependencies: [
                                                {
                                                    type: 'literal',
                                                    value: 'hi',
                                                },
                                            ],
                                        },
                                        {
                                            type: 'literal',
                                            value: 0,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            });

            it('should try to parse each argument as a non-expression first', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag("test", true, false, isBuilder)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'tag',
                            dependencies: [
                                {
                                    type: 'literal',
                                    value: 'test',
                                },
                                {
                                    type: 'literal',
                                    value: true,
                                },
                                {
                                    type: 'literal',
                                    value: false,
                                },
                                {
                                    type: 'member',
                                    identifier: 'isBuilder',
                                    object: null,
                                },
                            ],
                        },
                    ],
                });
            });

            it('should parse the tags after the expression', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag().aux.color`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'color',
                            object: {
                                type: 'member',
                                identifier: 'aux',
                                object: {
                                    type: type,
                                    name: 'tag',
                                    dependencies: [],
                                },
                            },
                        },
                    ],
                });
            });

            it('should support indexers after the expression', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag()['funny']`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'funny',
                            object: {
                                type: type,
                                name: 'tag',
                                dependencies: [],
                            },
                        },
                    ],
                });
            });

            it('should fail on expressions that use variables in indexer expressions', () => {
                expect(() => {
                    const result = dependencies.dependencyTree(
                        `${symbol}tag()[myVar]`
                    );
                }).toThrow();
            });

            it('should handle members in other function calls', () => {
                const result = dependencies.dependencyTree(
                    `math.sum(${symbol}tag().length)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'sum',
                                object: {
                                    type: 'member',
                                    identifier: 'math',
                                    object: null,
                                },
                            },
                            dependencies: [
                                {
                                    type: 'member',
                                    identifier: 'length',
                                    object: {
                                        type: type,
                                        name: 'tag',
                                        dependencies: [],
                                    },
                                },
                            ],
                        },
                    ],
                });
            });

            it('should handle function calls after the expression', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag().filter()`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'filter',
                                object: {
                                    type: type,
                                    name: 'tag',
                                    dependencies: [],
                                },
                            },
                            dependencies: [],
                        },
                    ],
                });
            });

            it('should include dependencies in filters', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag(x => x == this.val)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'tag',
                            dependencies: [
                                {
                                    type: 'expression',
                                    dependencies: [
                                        {
                                            type: 'member',
                                            identifier: 'x',
                                            object: null,
                                        },
                                        {
                                            type: 'member',
                                            identifier: 'val',
                                            object: {
                                                type: 'member',
                                                identifier: 'this',
                                                object: null,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            });

            it('should reject parameters from function expressions', () => {
                const result = dependencies.dependencyTree(
                    `${symbol}tag(function(x) { return x == this.val; })`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'tag',
                            dependencies: [
                                {
                                    type: 'expression',
                                    dependencies: [
                                        {
                                            type: 'member',
                                            identifier: 'x',
                                            object: null,
                                        },
                                        {
                                            type: 'member',
                                            identifier: 'val',
                                            object: {
                                                type: 'member',
                                                identifier: 'this',
                                                object: null,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            });
        });

        describe('this', () => {
            it(`should return dependencies on this`, () => {
                const result = dependencies.dependencyTree(
                    `this.num + this.index * this.something.else - this['other']['thing']`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'num',
                            object: {
                                type: 'member',
                                identifier: 'this',
                                object: null,
                            },
                        },
                        {
                            type: 'member',
                            identifier: 'index',
                            object: {
                                type: 'member',
                                identifier: 'this',
                                object: null,
                            },
                        },
                        {
                            type: 'member',
                            identifier: 'else',
                            object: {
                                type: 'member',
                                identifier: 'something',
                                object: {
                                    type: 'member',
                                    identifier: 'this',
                                    object: null,
                                },
                            },
                        },
                        {
                            type: 'member',
                            identifier: 'thing',
                            object: {
                                type: 'member',
                                identifier: 'other',
                                object: {
                                    type: 'member',
                                    identifier: 'this',
                                    object: null,
                                },
                            },
                        },
                    ],
                });
            });

            it(`should handle just the keyword without members`, () => {
                const result = dependencies.dependencyTree(`this`);

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'this',
                            object: null,
                        },
                    ],
                });
            });
        });

        describe('members', () => {
            it('should return dependencies for identifiers', () => {
                const result = dependencies.dependencyTree(`abc`);

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'abc',
                            object: null,
                        },
                    ],
                });
            });
        });

        describe('functions', () => {
            it(`should return dependencies for functions`, () => {
                const result = dependencies.dependencyTree(
                    `getFilesInContext("wow")`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'getFilesInContext',
                                object: null,
                            },
                            dependencies: [
                                {
                                    type: 'literal',
                                    value: 'wow',
                                },
                            ],
                        },
                    ],
                });
            });

            it(`should handle nested dependencies`, () => {
                const result = dependencies.dependencyTree(
                    `getFilesInContext(this.abc, "fun")`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'getFilesInContext',
                                object: null,
                            },
                            dependencies: [
                                {
                                    type: 'member',
                                    identifier: 'abc',
                                    object: {
                                        type: 'member',
                                        identifier: 'this',
                                        object: null,
                                    },
                                },
                                {
                                    type: 'literal',
                                    value: 'fun',
                                },
                            ],
                        },
                    ],
                });
            });

            it(`should properly handle namespaces`, () => {
                const result = dependencies.dependencyTree(
                    `player.toast(this.abc)`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'toast',
                                object: {
                                    type: 'member',
                                    identifier: 'player',
                                    object: null,
                                },
                            },
                            dependencies: [
                                {
                                    type: 'member',
                                    identifier: 'abc',
                                    object: {
                                        type: 'member',
                                        identifier: 'this',
                                        object: null,
                                    },
                                },
                            ],
                        },
                    ],
                });
            });

            it(`should allow identifiers`, () => {
                const result = dependencies.dependencyTree(`player.toast(abc)`);

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'toast',
                                object: {
                                    type: 'member',
                                    identifier: 'player',
                                    object: null,
                                },
                            },
                            dependencies: [
                                {
                                    type: 'member',
                                    identifier: 'abc',
                                    object: null,
                                },
                            ],
                        },
                    ],
                });
            });

            it(`should handle member expressions after the function call`, () => {
                const result = dependencies.dependencyTree(
                    `player.toast(abc).test`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'test',
                            object: {
                                type: 'call',
                                identifier: {
                                    type: 'member',
                                    identifier: 'toast',
                                    object: {
                                        type: 'member',
                                        identifier: 'player',
                                        object: null,
                                    },
                                },
                                dependencies: [
                                    {
                                        type: 'member',
                                        identifier: 'abc',
                                        object: null,
                                    },
                                ],
                            },
                        },
                    ],
                });
            });

            it(`should include dependencies from nested functions`, () => {
                const result = dependencies.dependencyTree(
                    `toast(x => "literal" + @tag + func())`
                );

                expect(result).toEqual({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'call',
                            identifier: {
                                type: 'member',
                                identifier: 'toast',
                                object: null,
                            },
                            dependencies: [
                                {
                                    type: 'expression',
                                    dependencies: [
                                        {
                                            type: 'literal',
                                            value: 'literal',
                                        },
                                        {
                                            type: 'file',
                                            name: 'tag',
                                            dependencies: [],
                                        },
                                        {
                                            type: 'call',
                                            identifier: {
                                                type: 'member',
                                                identifier: 'func',
                                                object: null,
                                            },
                                            dependencies: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            });
        });
    });

    describe('simplify()', () => {
        it('should return the list of tags that an expression is dependent on', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'file',
                        name: 'abc.def',
                        dependencies: [
                            {
                                type: 'tag',
                                name: 'test',
                                dependencies: [],
                            },
                        ],
                    },
                    {
                        type: 'tag',
                        name: 'ghi',
                        dependencies: [],
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'file',
                    name: 'abc.def',
                    dependencies: [
                        {
                            type: 'tag',
                            name: 'test',
                            dependencies: [],
                        },
                    ],
                },
                {
                    type: 'tag',
                    name: `ghi`,
                    dependencies: [],
                },
            ]);
        });

        it('should include functions that the tree is dependent on', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'call',
                        identifier: {
                            type: 'member',
                            identifier: 'abc',
                            object: {
                                type: 'member',
                                identifier: 'test',
                                object: null,
                            },
                        },
                        dependencies: [],
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'function',
                    name: 'test.abc',
                    dependencies: [],
                },
            ]);
        });

        it('should include dependencies for functions', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'call',
                        identifier: {
                            type: 'member',
                            identifier: 'abc',
                            object: {
                                type: 'member',
                                identifier: 'test',
                                object: null,
                            },
                        },
                        dependencies: [
                            {
                                type: 'member',
                                identifier: 'xyz',
                                object: {
                                    type: 'member',
                                    identifier: 'this',
                                    object: null,
                                },
                            },
                            {
                                type: 'member',
                                identifier: 'def',
                                object: {
                                    type: 'member',
                                    identifier: 'this',
                                    object: null,
                                },
                            },
                            {
                                type: 'literal',
                                value: 1234,
                            },
                        ],
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'function',
                    name: 'test.abc',
                    dependencies: [
                        {
                            type: 'this',
                        },
                        {
                            type: 'this',
                        },
                        {
                            type: 'literal',
                            value: 1234,
                        },
                    ],
                },
            ]);
        });

        it('should handle nested dependencies for functions', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'call',
                        identifier: {
                            type: 'member',
                            identifier: 'toast',
                            object: null,
                        },
                        dependencies: [
                            {
                                type: 'expression',
                                dependencies: [
                                    {
                                        type: 'literal',
                                        value: 'literal',
                                    },
                                    {
                                        type: 'file',
                                        name: 'tag',
                                        dependencies: [],
                                    },
                                    {
                                        type: 'call',
                                        identifier: {
                                            type: 'member',
                                            identifier: 'func',
                                            object: null,
                                        },
                                        dependencies: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'function',
                    name: 'toast',
                    dependencies: [
                        {
                            type: 'literal',
                            value: 'literal',
                        },
                        {
                            type: 'file',
                            name: 'tag',
                            dependencies: [],
                        },
                        {
                            type: 'function',
                            name: 'func',
                            dependencies: [],
                        },
                    ],
                },
            ]);
        });

        it('should break up functions that have tag dependencies in their identifier', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'call',
                        identifier: {
                            type: 'member',
                            identifier: 'abc',
                            object: {
                                type: 'tag',
                                name: 'test',
                                dependencies: [],
                            },
                        },
                        dependencies: [
                            {
                                type: 'member',
                                identifier: 'def',
                                object: null,
                            },
                        ],
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'tag',
                    name: 'test',
                    dependencies: [],
                },
                {
                    type: 'member',
                    name: 'def',
                },
            ]);
        });

        it('should include members that the tree is dependent on', () => {
            const result = dependencies.simplify({
                type: 'expression',
                dependencies: [
                    {
                        type: 'member',
                        identifier: 'abc',
                        object: {
                            type: 'member',
                            identifier: 'test',
                            object: null,
                        },
                    },
                ],
            });

            expect(result).toEqual([
                {
                    type: 'member',
                    name: 'test.abc',
                },
            ]);
        });

        const cases = [
            ['@ expressions', 'file', '@'],
            ['# expressions', 'tag', '#'],
        ];
        describe.each(cases)('%s', (desc, type, symbol) => {
            it('should ignore member nodes when they are for tag/file expressions', () => {
                const result = dependencies.simplify({
                    type: 'expression',
                    dependencies: [
                        {
                            type: 'member',
                            identifier: 'abc',
                            object: {
                                type: 'member',
                                identifier: 'test',
                                object: {
                                    type: type,
                                    name: 'hello',
                                    dependencies: [],
                                },
                            },
                        },
                    ],
                });

                expect(result).toEqual([
                    {
                        type: type,
                        name: `hello`,
                        dependencies: [],
                    },
                ]);
            });

            it('should include dependencies', () => {
                const result = dependencies.simplify({
                    type: 'expression',
                    dependencies: [
                        {
                            type: type,
                            name: 'hello',
                            dependencies: [
                                {
                                    type: 'member',
                                    identifier: 'isBuilder',
                                    object: null,
                                },
                                {
                                    type: 'call',
                                    identifier: {
                                        type: 'member',
                                        identifier: 'isBuilder',
                                        object: {
                                            type: 'member',
                                            identifier: 'player',
                                            object: null,
                                        },
                                    },
                                    dependencies: [],
                                },
                            ],
                        },
                    ],
                });

                expect(result).toEqual([
                    {
                        type: type,
                        name: `hello`,
                        dependencies: [
                            {
                                type: 'member',
                                name: 'isBuilder',
                            },
                            {
                                type: 'function',
                                name: 'player.isBuilder',
                                dependencies: [],
                            },
                        ],
                    },
                ]);
            });
        });
    });

    describe('getMemberName()', () => {
        it('should return the identifier', () => {
            const result = dependencies.getMemberName({
                type: 'member',
                identifier: 'abc',
                object: null,
            });

            expect(result).toBe('abc');
        });

        it('should return the identifiers joined by dots', () => {
            const result = dependencies.getMemberName({
                type: 'member',
                identifier: 'abc',
                object: {
                    type: 'member',
                    identifier: 'def',
                    object: null,
                },
            });

            expect(result).toBe('def.abc');
        });

        it('should handle call expressions', () => {
            const result = dependencies.getMemberName({
                type: 'member',
                identifier: 'abc',
                object: {
                    type: 'call',
                    identifier: {
                        type: 'member',
                        identifier: 'def',
                        object: null,
                    },
                    dependencies: [],
                },
            });

            expect(result).toBe('def.().abc');
        });

        const cases = [
            ['@ expressions', 'file', '@'],
            ['# expressions', 'tag', '#'],
        ];

        describe.each(cases)('%s', (desc, type, symbol) => {
            it('should handle expressions', () => {
                const result = dependencies.getMemberName({
                    type: 'member',
                    identifier: 'abc',
                    object: {
                        type: 'member',
                        identifier: 'def',
                        object: {
                            type: type,
                            name: 'tag.abc',
                            dependencies: [],
                        },
                    },
                });

                expect(result).toBe(`tag.abc.def.abc`);
            });
        });
    });

    describe('replaceDependencies()', () => {
        it('should replace functions with the given expansions', () => {
            let replacements: AuxScriptReplacements = {
                getFilesInContext: (
                    node: AuxScriptSimpleFunctionDependency
                ) => [
                    {
                        type: 'file',
                        name: 'test',
                        dependencies: [],
                    },
                ],
            };

            const result = dependencies.replaceDependencies(
                [
                    {
                        type: 'function',
                        name: 'getFilesInContext',
                        dependencies: [],
                    },
                ],
                replacements
            );

            expect(result).toEqual([
                {
                    type: 'file',
                    name: 'test',
                    dependencies: [],
                },
            ]);
        });

        it('should not do any replacements on a replacement node', () => {
            let replacements: AuxScriptReplacements = {
                getFilesInContext: (
                    node: AuxScriptSimpleFunctionDependency
                ) => [
                    {
                        type: 'file',
                        name: 'test',
                        dependencies: [],
                    },
                ],

                test: node => [
                    {
                        type: 'tag',
                        name: 'qwerty',
                        dependencies: [],
                    },
                ],
            };

            const result = dependencies.replaceDependencies(
                [
                    {
                        type: 'function',
                        name: 'getFilesInContext',
                        dependencies: [],
                    },
                ],
                replacements
            );

            expect(result).toEqual([
                {
                    type: 'file',
                    name: 'test',
                    dependencies: [],
                },
            ]);
        });

        const nestedReplacementCases = [['function'], ['file'], ['tag']];

        it.each(nestedReplacementCases)(
            'should replace dependencies in %s when it doesnt have a replacement',
            type => {
                let replacements: AuxScriptReplacements = {
                    myVar: (node: AuxScriptSimpleMemberDependency) => [
                        {
                            type: 'file',
                            name: 'test',
                            dependencies: [],
                        },
                    ],
                };

                const result = dependencies.replaceDependencies(
                    [
                        {
                            type: type,
                            name: 'abc',
                            dependencies: [
                                {
                                    type: 'member',
                                    name: 'myVar',
                                },
                            ],
                        },
                    ],
                    replacements
                );

                expect(result).toEqual([
                    {
                        type: type,
                        name: 'abc',
                        dependencies: [
                            {
                                type: 'file',
                                name: 'test',
                                dependencies: [],
                            },
                        ],
                    },
                ]);
            }
        );

        it('should work on complicated formulas', () => {
            const tree = dependencies.dependencyTree(
                '#name().filter(a => a == "bob" || a == "alice").length + (player.isDesigner() ? 0 : 1)'
            );
            const simple = dependencies.simplify(tree);
            const replacements: AuxScriptReplacements = {
                'player.isDesigner': (
                    node: AuxScriptSimpleFunctionDependency
                ) => [
                    {
                        type: 'tag',
                        name: 'aux.designers',
                        dependencies: [],
                    },
                ],
            };
            const replaced = dependencies.replaceDependencies(
                simple,
                replacements
            );

            expect(replaced).toEqual([
                {
                    type: 'tag',
                    name: 'name',
                    dependencies: [],
                },
                {
                    type: 'member',
                    name: 'a',
                },
                {
                    type: 'literal',
                    value: 'bob',
                },
                {
                    type: 'member',
                    name: 'a',
                },
                {
                    type: 'literal',
                    value: 'alice',
                },
                {
                    type: 'tag',
                    name: 'aux.designers',
                    dependencies: [],
                },
                {
                    type: 'literal',
                    value: 0,
                },
                {
                    type: 'literal',
                    value: 1,
                },
            ]);
        });
    });

    describe('flatten()', () => {
        it('should flatten the given list of simplified dependencies', () => {
            const result = dependencies.flatten([
                {
                    type: 'member',
                    name: 'abc',
                },
                {
                    type: 'function',
                    name: 'func',
                    dependencies: [
                        {
                            type: 'file',
                            name: 'bob',
                            dependencies: [],
                        },
                    ],
                },
                {
                    type: 'tag',
                    name: 'online',
                    dependencies: [
                        {
                            type: 'literal',
                            value: 123,
                        },
                    ],
                },
                {
                    type: 'file',
                    name: 'online',
                    dependencies: [
                        {
                            type: 'function',
                            name: 'def',
                            dependencies: [
                                {
                                    type: 'member',
                                    name: 'this',
                                },
                            ],
                        },
                        {
                            type: 'tag',
                            name: 'qwerty',
                            dependencies: [],
                        },
                    ],
                },
                {
                    type: 'tag_value',
                    name: 'test',
                    dependencies: [{ type: 'this' }],
                },
            ]);

            expect(result).toEqual([
                {
                    type: 'member',
                    name: 'abc',
                },
                {
                    type: 'function',
                    name: 'func',
                    dependencies: [
                        {
                            type: 'file',
                            name: 'bob',
                            dependencies: [],
                        },
                    ],
                },
                {
                    type: 'file',
                    name: 'bob',
                    dependencies: [],
                },
                {
                    type: 'tag',
                    name: 'online',
                    dependencies: [
                        {
                            type: 'literal',
                            value: 123,
                        },
                    ],
                },
                {
                    type: 'literal',
                    value: 123,
                },
                {
                    type: 'file',
                    name: 'online',
                    dependencies: [
                        {
                            type: 'function',
                            name: 'def',
                            dependencies: [
                                {
                                    type: 'member',
                                    name: 'this',
                                },
                            ],
                        },
                        {
                            type: 'tag',
                            name: 'qwerty',
                            dependencies: [],
                        },
                    ],
                },
                {
                    type: 'function',
                    name: 'def',
                    dependencies: [
                        {
                            type: 'member',
                            name: 'this',
                        },
                    ],
                },
                {
                    type: 'member',
                    name: 'this',
                },
                {
                    type: 'tag',
                    name: 'qwerty',
                    dependencies: [],
                },
                {
                    type: 'tag_value',
                    name: 'test',
                    dependencies: [{ type: 'this' }],
                },
                {
                    type: 'this',
                },
            ]);
        });
    });

    describe('replaceAuxDependencies()', () => {
        const fileDependencyCases = [
            ['getBot()', 'getBot'],
            ['getBots()', 'getBot'],
        ];

        describe.each(fileDependencyCases)('%s', (desc, name) => {
            it('should replace with a file dependency on the given tag', () => {
                const tree = dependencies.dependencyTree(
                    `${name}("#name", "value")`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'name',
                        dependencies: [
                            {
                                type: 'literal',
                                value: 'value',
                            },
                        ],
                    },
                ]);
            });

            it('should fail when unable to determine what tag to use for the name', () => {
                const tree = dependencies.dependencyTree(
                    `${name}(myVar, "value")`
                );
                const simple = dependencies.simplify(tree);

                expect(() => {
                    const replaced = dependencies.replaceAuxDependencies(
                        simple
                    );
                }).toThrow();
            });

            it('should replace inner dependencies', () => {
                const tree = dependencies.dependencyTree(
                    `${name}("#abc", ${name}("#def"))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'abc',
                        dependencies: [
                            {
                                type: 'file',
                                name: 'def',
                                dependencies: [],
                            },
                        ],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`${name}`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: name,
                    },
                ]);
            });
        });

        describe('getBotsInContext()', () => {
            it('should replace with a file dependency on the given context', () => {
                const tree = dependencies.dependencyTree(
                    `getBotsInContext("name")`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'name',
                        dependencies: [],
                    },
                ]);
            });

            it('should not trim the tag name', () => {
                const tree = dependencies.dependencyTree(
                    `getBotsInContext("#name")`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: '#name',
                        dependencies: [],
                    },
                ]);
            });

            it('should fail when unable to determine what tag to use for the name', () => {
                const tree = dependencies.dependencyTree(
                    `getBotsInContext(myVar)`
                );
                const simple = dependencies.simplify(tree);

                expect(() => {
                    const replaced = dependencies.replaceAuxDependencies(
                        simple
                    );
                }).toThrow();
            });

            it('should remove inner dependencies', () => {
                const tree = dependencies.dependencyTree(
                    `getBotsInContext("abc", getBotsInContext("#def"))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'abc',
                        dependencies: [],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`getBotsInContext`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: 'getBotsInContext',
                    },
                ]);
            });
        });

        const fileStackCases = [['getBotsInStack'], ['getNeighboringBots']];

        describe.each(fileStackCases)('%s()', name => {
            it('should replace with dependencies on the the context, x, and y tags', () => {
                const tree = dependencies.dependencyTree(
                    `${name}(this, 'abc')`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'abc',
                        dependencies: [],
                    },
                    {
                        type: 'file',
                        name: 'abc.x',
                        dependencies: [],
                    },
                    {
                        type: 'file',
                        name: 'abc.y',
                        dependencies: [],
                    },
                ]);
            });

            it('should fail when unable to determine what tag to use for the name', () => {
                const tree = dependencies.dependencyTree(
                    `${name}(this, myVar)`
                );
                const simple = dependencies.simplify(tree);

                expect(() => {
                    const replaced = dependencies.replaceAuxDependencies(
                        simple
                    );
                }).toThrow();
            });

            it('should remove inner dependencies', () => {
                const tree = dependencies.dependencyTree(
                    `${name}(this, "abc", ${name}("#def"))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'file',
                        name: 'abc',
                        dependencies: [],
                    },
                    {
                        type: 'file',
                        name: 'abc.x',
                        dependencies: [],
                    },
                    {
                        type: 'file',
                        name: 'abc.y',
                        dependencies: [],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`${name}`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: name,
                    },
                ]);
            });
        });

        describe('getBotTagValues()', () => {
            it('should replace with dependency on the the tag', () => {
                const tree = dependencies.dependencyTree(
                    `getBotTagValues('#abc')`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: 'abc',
                        dependencies: [],
                    },
                ]);
            });

            it('should fail when unable to determine what tag to use for the name', () => {
                const tree = dependencies.dependencyTree(
                    `getBotTagValues(myVar)`
                );
                const simple = dependencies.simplify(tree);

                expect(() => {
                    const replaced = dependencies.replaceAuxDependencies(
                        simple
                    );
                }).toThrow();
            });

            it('should replace inner dependencies', () => {
                const tree = dependencies.dependencyTree(
                    `getBotTagValues("#abc", getBotTagValues("#def"))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: 'abc',
                        dependencies: [
                            {
                                type: 'tag',
                                name: 'def',
                                dependencies: [],
                            },
                        ],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`getBotTagValues`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: 'getBotTagValues',
                    },
                ]);
            });
        });

        describe('player.isDesigner()', () => {
            it('should replace with tag dependency on aux.designers', () => {
                const tree = dependencies.dependencyTree(`player.isDesigner()`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: 'aux.designers',
                        dependencies: [],
                    },
                ]);
            });

            it('should remove inner dependencies', () => {
                const tree = dependencies.dependencyTree(
                    `player.isDesigner(player.isDesigner("#def"))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: 'aux.designers',
                        dependencies: [],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`player.isDesigner`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: 'player.isDesigner',
                    },
                ]);
            });
        });

        describe('player.hasFileInInventory()', () => {
            // TODO: Improve to use a more restricted dependency style
            it('should replace with an all dependency', () => {
                const tree = dependencies.dependencyTree(
                    `player.hasFileInInventory(file)`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'all',
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(
                    `player.hasFileInInventory`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: 'player.hasFileInInventory',
                    },
                ]);
            });
        });

        const playerContextCases = [
            ['player.getMenuContext', 'aux._userMenuContext'],
            ['player.getInventoryContext', 'aux._userInventoryContext'],
            ['player.currentContext', 'aux._userContext'],
        ];

        describe.each(playerContextCases)('%s()', (name, tag) => {
            it(`should replace with a tag dependency on ${tag}`, () => {
                const tree = dependencies.dependencyTree(`${name}()`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: tag,
                        dependencies: [],
                    },
                ]);
            });

            it(`should remove inner dependencies`, () => {
                const tree = dependencies.dependencyTree(
                    `${name}(getBot('#abc'))`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag',
                        name: tag,
                        dependencies: [],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`${name}`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: name,
                    },
                ]);
            });
        });

        describe('getTag()', () => {
            it('should replace with a tag value dependency', () => {
                const tree = dependencies.dependencyTree(
                    `getTag(myVar, '#abc.xyz')`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag_value',
                        name: 'abc.xyz',
                        dependencies: [{ type: 'member', name: 'myVar' }],
                    },
                ]);
            });

            it('should support multiple tags in a single call', () => {
                const tree = dependencies.dependencyTree(
                    `getTag(myVar, '#abc.xyz', '#test')`
                );
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'tag_value',
                        name: 'abc.xyz',
                        dependencies: [{ type: 'member', name: 'myVar' }],
                    },
                    {
                        type: 'tag_value',
                        name: 'test',
                        dependencies: [],
                    },
                ]);
            });

            it('should not replace if it is not a function call', () => {
                const tree = dependencies.dependencyTree(`getTag`);
                const simple = dependencies.simplify(tree);
                const replaced = dependencies.replaceAuxDependencies(simple);

                expect(replaced).toEqual([
                    {
                        type: 'member',
                        name: 'getTag',
                    },
                ]);
            });
        });
    });

    describe('calculateAuxDependencies()', () => {
        const cases: any = [
            [
                'getBot("#tag")',
                [
                    {
                        type: 'file',
                        name: 'tag',
                        dependencies: [],
                    },
                ],
            ],
        ];

        it.each(cases)('%s', (formula, expected) => {
            const tags = dependencies.calculateAuxDependencies(formula);
            expect(tags).toEqual(expected);
        });

        it('should return tag_value dependencies', () => {
            const deps = dependencies.calculateAuxDependencies(
                'getTag(abc, "#def")'
            );

            expect(deps).toEqual([
                {
                    type: 'tag_value',
                    name: 'def',
                    dependencies: [{ type: 'member', name: 'abc' }],
                },
            ]);
        });

        it('should return an empty array when there is a syntax error', () => {
            const deps = dependencies.calculateAuxDependencies('getTag(abc');

            expect(deps).toEqual([]);
        });
    });
});