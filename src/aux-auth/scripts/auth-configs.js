const path = require('path');
const {
    paths,
    cleanDirectory,
    watch,
    setup,
    getExternals,
    replaceEsbuildPlugin,
    replaceThreePlugin,
} = require('../../../script/build-helpers');
const fs = require('fs');
const { GIT_HASH, GIT_TAG } = require('../../../script/git-stats');

const src = path.resolve(paths.root, 'src');
const auxAuth = path.resolve(src, 'aux-auth');
const server = path.resolve(auxAuth, 'server');
const serverDist = path.resolve(server, 'dist');
const serverPackageJson = path.resolve(auxAuth, 'package.json');
const serverExternals = [...getExternals(serverPackageJson), 'esbuild'];

const serverless = path.resolve(auxAuth, 'serverless');
const serverlessDist = path.resolve(serverless, 'aws', 'dist');
const serverlessSrc = path.resolve(serverless, 'aws', 'src');
const serverlessHandlers = path.resolve(serverlessSrc, 'handlers');
const magicSecretKeyPath = path.resolve(
    __dirname,
    '..',
    'MAGIC_SECRET_KEY.txt'
);

module.exports = {
    createConfigs,
    cleanDirectories,
};

function cleanDirectories() {
    cleanDirectory(serverDist);
    cleanDirectory(serverlessDist);
}

function createConfigs(dev, version) {
    const versionVariables = {
        GIT_HASH: JSON.stringify(GIT_HASH),
        GIT_TAG: JSON.stringify(version ?? GIT_TAG),
    };
    const developmentVariables = {
        DEVELOPMENT: dev ?? JSON.stringify(true),
    };
    const magicSecretKey = fs.existsSync(magicSecretKeyPath)
        ? fs.readFileSync(magicSecretKeyPath, 'utf8').trim()
        : null;
    return [
        [
            'Auth Server',
            {
                entryPoints: [path.resolve(server, 'index.ts')],
                outfile: path.resolve(serverDist, 'main.js'),
                platform: 'node',
                target: ['node14.16'],
                external: serverExternals,
                define: {
                    ...versionVariables,
                    ...developmentVariables,
                    MAGIC_SECRET_KEY: JSON.stringify(
                        process.env.MAGIC_SECRET_KEY ?? magicSecretKey
                    ),
                },
                minify: !dev,
            },
        ],
        [
            'Auth Serverless',
            {
                entryPoints: [
                    path.resolve(serverlessHandlers, 'metadata.js'),
                    path.resolve(serverlessHandlers, 'services.js'),
                    path.resolve(serverlessHandlers, 'records.js'),
                    path.resolve(serverlessHandlers, 'email.js'),
                ],
                outdir: path.resolve(serverlessDist, 'handlers'),
                platform: 'node',
                target: ['node14.16'],
                define: {
                    ...versionVariables,
                    ...developmentVariables,
                    DYNAMODB_ENDPOINT: dev
                        ? JSON.stringify('http://dynamodb:8000')
                        : JSON.stringify(undefined),
                    S3_ENDPOINT: dev
                        ? JSON.stringify('http://s3:4566')
                        : JSON.stringify(undefined),
                },
                minify: !dev,
            },
        ],
    ];
}