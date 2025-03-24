import { getViteLibraryConfig } from '@lesnoypudge/builder';



const { getBasePreparedConfig } = getViteLibraryConfig({
    importMetaUrl: import.meta.url,
    tsconfigPath: './tsconfig.node.build.json',
});

export default getBasePreparedConfig();