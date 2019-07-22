import { AuxUserAuthorizer } from './AuxUserAuthorizer';
import { LoadedChannel } from '@casual-simulation/causal-tree-server';
import {
    USERNAME_CLAIM,
    USER_ROLE,
    ADMIN_ROLE,
} from '@casual-simulation/causal-trees';
import { Subscription } from 'rxjs';
import {
    AuxCausalTree,
    createFile,
    GLOBALS_FILE_ID,
} from '@casual-simulation/aux-common';
import { storedTree, site } from '@casual-simulation/causal-trees';
import {
    AuxLoadedChannel,
    NodeAuxChannel,
} from '@casual-simulation/aux-vm-node';

console.log = jest.fn();

describe('AuxUserAuthorizer', () => {
    let authorizer: AuxUserAuthorizer;
    let tree: AuxCausalTree;
    let channel: AuxLoadedChannel;

    beforeEach(async () => {
        tree = new AuxCausalTree(storedTree(site(1)));
        const nodeChannel = new NodeAuxChannel(
            tree,
            {
                id: 'user',
                isGuest: false,
                name: 'name',
                token: 'token',
                username: 'username',
            },
            {
                config: { isBuilder: false, isPlayer: false },
                host: 'any',
                id: 'test',
                treeName: 'test',
            }
        );

        await tree.root();
        await nodeChannel.init(() => {}, () => {}, () => {}, () => {});

        channel = {
            info: {
                id: 'test',
                type: 'aux',
            },
            subscription: new Subscription(),
            tree: tree,
            channel: nodeChannel,
        };
        authorizer = new AuxUserAuthorizer();
    });

    it('should throw if the channel type is not aux', () => {
        const channel = {
            info: {
                id: 'test',
                type: 'something else',
            },
            subscription: new Subscription(),
            tree: tree,
        };

        expect(() => {
            authorizer.isAllowedAccess(
                {
                    claims: {
                        [USERNAME_CLAIM]: 'test',
                    },
                    roles: [ADMIN_ROLE],
                },
                channel
            );
        }).toThrow();
    });

    it('should deny access when given null', () => {
        const allowed = authorizer.isAllowedAccess(null, channel);

        expect(allowed).toBe(false);
    });

    it('should always allow a user in the admin role', () => {
        const allowed = authorizer.isAllowedAccess(
            {
                claims: {
                    [USERNAME_CLAIM]: 'test',
                },
                roles: [ADMIN_ROLE],
            },
            channel
        );

        expect(allowed).toBe(true);
    });

    it('should not allow users without the user role', () => {
        const allowed = authorizer.isAllowedAccess(
            {
                claims: {
                    [USERNAME_CLAIM]: 'test',
                },
                roles: [],
            },
            channel
        );

        expect(allowed).toBe(false);
    });

    it('should allow access if there is no globals file', async () => {
        let allowed = authorizer.isAllowedAccess(
            {
                claims: {
                    [USERNAME_CLAIM]: 'username',
                },
                roles: [USER_ROLE],
            },
            channel
        );

        expect(allowed).toBe(true);
    });

    describe('aux.whitelist.roles', () => {
        const whitelistCases = [
            [
                'should allow users with the given role',
                ['admin'],
                ['admin'],
                true,
            ],
            [
                'should reject users without the given role',
                ['not_admin'],
                ['admin'],
                false,
            ],
            [
                'should reject users without the given roles',
                ['extra'],
                ['admin', 'extra'],
                false,
            ],
            [
                'should allow users that have all the required roles',
                ['other', 'extra', 'any'],
                ['extra', 'other'],
                true,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                roles: string[],
                whitelist: any,
                expected: boolean
            ) => {
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.whitelist.roles': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: 'username',
                        },
                        roles: [USER_ROLE, ...roles],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });

    describe('aux.blacklist.roles', () => {
        const whitelistCases = [
            [
                'should reject users with the given role',
                ['test'],
                ['test'],
                false,
            ],
            [
                'should allow users without the given role',
                ['not_admin'],
                ['admin'],
                true,
            ],
            [
                'should reject users with one of the given roles',
                ['extra'],
                ['admin', 'extra'],
                false,
            ],
            [
                'should reject users that have all the given roles',
                ['other', 'extra', 'any'],
                ['extra', 'other'],
                false,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                roles: string[],
                whitelist: any,
                expected: boolean
            ) => {
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.blacklist.roles': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: 'username',
                        },
                        roles: [USER_ROLE, ...roles],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });

    describe('whitelist', () => {
        const whitelistCases = [
            ['should allow users in the whitelist', 'test', ['test'], true],
            [
                'should reject users not in the whitelist',
                'not_test',
                ['test'],
                false,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                username: string,
                whitelist: any,
                expected: boolean
            ) => {
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.whitelist': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: username,
                        },
                        roles: [USER_ROLE],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });

    describe('blacklist', () => {
        const whitelistCases = [
            ['should reject users in the blacklist', 'test', ['test'], false],
            [
                'should allow users not in the blacklist',
                'not_test',
                ['test'],
                true,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                username: string,
                whitelist: any,
                expected: boolean
            ) => {
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.blacklist': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: username,
                        },
                        roles: [USER_ROLE],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });
});