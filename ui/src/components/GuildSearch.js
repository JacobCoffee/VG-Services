import React, { useState } from 'react';
import { debounce } from 'lodash-es';
import { Search } from 'semantic-ui-react';

function GuildSearch(props) {
  // const [ guildOptions, setGuildOptions ] = useState([]);
  const { guild=[], onChange=()=>{}, value } = props;

  if(value == null) {
    return null;
  }

  const allGuildOptions = guild.map(it => Object.assign({}, it, { title: it.player_name || '' }));
  const guildOptions = allGuildOptions.filter(it => {
    return it.title.toLowerCase().startsWith(value.toLowerCase())
  });

  return <Search
    onResultSelect={(evt, { result }) => onChange(result.player_name)}
    onSearchChange={(e, { value }) => onChange(value)}
    results={guildOptions}
    value={value}
  />
}

export default GuildSearch