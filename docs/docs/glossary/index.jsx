import AUX from './AuxFile.mdx';
import AB1 from './ab1.mdx';
import Bot from './Bot.mdx';
import CasualOS from './CasualOS.mdx';
import Dimension from './Dimension.mdx';
import Instance from './Instance.mdx';
import Portal from './Portal.mdx';
import Tag from './Tag.mdx';
import GridPortal from './GridPortal.mdx';
import MapPortal from './MapPortal.mdx';
import MiniGridPortal from './MiniGridPortal.mdx';
import MiniMapPortal from './MiniMapPortal.mdx';
import SystemPortal from './SystemPortal.mdx';
import React, { useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Tooltip from 'rc-tooltip';

import 'rc-tooltip/assets/bootstrap.css';

export const Glossary = [
    { id: 'aux', title: 'AUX', content: () => <AUX/> },
    { id: 'ab-1', title: 'ab-1', content: () => <AB1/> },
    { id: 'bot', title: 'Bot', content: () => <Bot/> },
    { id: 'casualos', title: 'CasualOS', content: () => <CasualOS/> },
    { id: 'dimension', title: 'Dimension', content: () => <Dimension/> },
    { id: 'instance', title: 'Instance', content: () => <Instance/> },
    { id: 'portal', title: 'Portal', content: () => <Portal/> },
    { id: 'tag', title: 'Tag', content: () => <Tag/> },
    { id: 'gridPortal', title: 'gridPortal', content: () => <GridPortal/> },
    { id: 'mapPortal', title: 'mapPortal', content: () => <MapPortal/> },
    { id: 'miniGridPortal', title: 'miniGridPortal', content: () => <MiniGridPortal/> },
    { id: 'miniMapPortal', title: 'miniMapPortal', content: () => <MiniMapPortal/> },
    { id: 'systemPortal', title: 'systemPortal', content: () => <SystemPortal/> },
];

const GlossaryWindow = ({item}) => (<div className="glossary-window">
    <h4 className="glossary-title">{item.title}</h4>
    <div className="glossary-content">{item.content()}</div>
</div>);

export const GlossaryRef = ({term, children}) => {
    const item = Glossary.find(i => i.id === term);
    return (
        <Tooltip placement="top" overlay={<GlossaryWindow item={item}/>}>
            <a href={useBaseUrl('docs/glossary') + `#${item.id.replace(/[\.\(\)\@\[\]]/g, '').toLowerCase()}`}>{children}</a>
        </Tooltip>
    )
};

export {
    AUX,
    AB1,
    Bot,
    CasualOS,
    Dimension,
    Instance,
    Portal,
    Tag,
    GridPortal,
    MapPortal,
    MiniGridPortal,
    MiniMapPortal,
    SystemPortal,
};