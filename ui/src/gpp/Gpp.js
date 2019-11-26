import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table } from 'semantic-ui-react';
import { sortBy } from 'lodash-es';

import { wowClasses, unknownClass } from '../styles';

import GppDetail from './GppDetail';

function Gpp(props) {
  const [summary, setSummary] = useState();

  const [sort, setSort] = useState({ column: 'gpp', asc: false });
  const [filter, setFilter] = useState();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { guild } = props;

  useEffect(() => {
    axios(
      '/api/gpp',
    ).then(result => setSummary(result.data))
  }, []);

  function GppRow(props) {
    const { class: wowClass, rank } = props.guildEntry || {};
    const { player_name: player, gpp } = props.row;
    const classStyles = wowClass ? wowClasses[wowClass.toLowerCase()] : unknownClass;
  
    return (
      <Table.Row onClick={() => selectPlayer(player)} style={{ padding: 2, cursor: 'pointer' }}>
        <Table.Cell style={{textAlign:'left'}}>
          <classStyles.icon />
          <span style={{ marginLeft: 10 }}>{player}</span>
        </Table.Cell>
        <Table.Cell>{rank}</Table.Cell>
        <Table.Cell>{gpp}</Table.Cell>
      </Table.Row>
    );
  }

  function renderSummary() {
    const column = sort.column;
    // Merge the guild list into the summary
    let merged = summary.map(item => {
      const guildEntry = guild.find(it => it.player_name === item.player_name) || {}
      return Object.assign({}, guildEntry, item);
    });
    let sorted = sort ? sortBy(merged, (it) => column === 'gpp' ? parseInt(it[column], 10) : it[column]) : summary;
    sorted = sort.asc ? sorted : sorted.reverse();

    return sorted.map(it => {
      const guildEntry = guild.find(g => it.player_name === g.player_name);
      if(filter) {
        if(filter.column === 'class' && guildEntry && guildEntry.class.toLowerCase() === filter.value) {
          return <GppRow key={it.player_name} row={it} guildEntry={guildEntry} />
        } else {
          return null;
        }
      }
      return <GppRow key={it.player_name} row={it} guildEntry={guildEntry} />
    });
  }

  function updateSort(column) {
    // Flip sort on same col
    if(sort && sort.column === column) {
      setSort({ column, asc: !sort.asc })
    } else {
      setSort({ column, asc: true })
    }
  }

  function updateFilter(column, value) {
    if(filter && column === filter.column && value === filter.value) {
      setFilter(null)
    } else {
      setFilter({ column, value });
    }
  }

  function selectPlayer(player) {
    setSelectedPlayer(player);
    setModalOpen(true);
  }

  const sortDirection = sort.asc ? 'ascending' : 'descending';

  return (
    <Table sortable inverted basic='very' celled compact verticalAlign='center' selectable>
      { selectedPlayer != null ? <GppDetail summary={summary} guild={guild} showEdit={props.showEdit} open={modalOpen} player={selectedPlayer} raids={props.raids} setOpen={setModalOpen} /> : null }
      <Table.Header fullWidth>
        <Table.Row>
          <Table.HeaderCell colSpan='3'>Guild Power Points</Table.HeaderCell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell colSpan='3'>
            Filter by:
            { Object.entries(wowClasses).map(([key, val]) =>
              <span
                key={key}
                style={{ cursor: 'pointer', marginLeft: 10 }}>
                  {<val.icon onClick={() => updateFilter('class', key)} selected={filter && filter.column === 'class' && filter.value === key ? 'selected-filter' : ''} selectedClass={'selected-filter'} />}
              </span>
            )}
            <Button secondary style={{ marginLeft: '10px' }}onClick={() => setFilter(null)}>Reset</Button>
          </Table.HeaderCell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell
            style={{ cursor: 'pointer', fontSize: 16 }}
            sorted={sort.column === 'player_name' ? sortDirection : null}
            onClick={() => updateSort('player_name')}>
              Player
          </Table.HeaderCell>
          <Table.HeaderCell
            style={{ cursor: 'pointer', fontSize: 16 }}
            sorted={sort.column === 'rank_index' ? sortDirection : null}
            onClick={() => updateSort('rank_index')}>
              Rank
          </Table.HeaderCell>
          <Table.HeaderCell
            style={{ cursor: 'pointer', fontSize: 16 }}
            sorted={sort.column === 'gpp' ? sortDirection : null}
            onClick={() => updateSort('gpp')}>
              GPP
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {summary && guild ? renderSummary() : <Table.Row><Table.Cell>Loading...</Table.Cell></Table.Row>}
      </Table.Body>
    </Table>
  );
}

export default Gpp;
