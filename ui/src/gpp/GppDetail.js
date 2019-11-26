import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Modal, Table } from 'semantic-ui-react';
import { sortBy } from 'lodash-es';
import { modalStyles } from '../styles';

import GppDelete from './GppDelete';
import GppEdit from './GppEdit';
import GppTransfer from './GppTransfer';

function GppDetail(props) {
  const [playerEvents, setPlayerEvents] = useState();

  const { guild, raids, summary } = props;

  useEffect(() => {
    setPlayerEvents([]);
    axios(
      `/api/player_events?player_name=${props.player}`,
    ).then(result => setPlayerEvents(result.data))
  }, [props.player]);

  function deleteEvent(event) {
    setPlayerEvents(playerEvents.filter(it => it.id !== event.id));
  }

  function editEvent(event) {
    const index = playerEvents.findIndex(it => it.id === event.id);
    if(index !== -1) {
      playerEvents[index] = event;
      setPlayerEvents([...playerEvents]);
    }
  }

  function transferEvent(event) {
    setPlayerEvents(playerEvents.filter(it => it.id !== event.id));
  }

  const eventMap = {
    RAID_LOOT: (evt) => <span>{`Loot (${evt.event_data.action.toLowerCase()})`}</span>,
    RAID_ON_TIME: (evt) => <span>{'On time bonus'}</span>,
    RAID_PRESENCE: (evt) => <span>{'Time in raid'}</span>,
    RAID_FULL_DURATION: (evt) => <span>{'Full raid bonus'}</span>,
    RAID_BOSS: (evt) => <span>{'Boss kill'}</span>
  }

  const eventDetailMap = {
    RAID_LOOT: (evt) => {
      const itemId = `item=${evt.event_data.item_id}`;
      return <><a className={'epic-item'} href={`https://classicdb.ch/?${itemId}`} target='_blank' rel={`${itemId} noopener noreferrer`}>{evt.event_data.name}</a></>
    },
    RAID_ON_TIME: (evt, raid) => <>{raid && raid.instances && raid.instances.map(it => it.name).join(', ')}</>,
    RAID_PRESENCE: (evt) => <>{`${(evt.event_data.total_seconds / 3600).toFixed(2)} hours`}</>,
    RAID_FULL_DURATION: (evt, raid) => <>{raid && raid.instances && raid.instances.map(it => it.name).join(', ')}</>,
    RAID_BOSS: (evt) => <><span className={'boss-name'}>{evt.event_data.name}</span></>
  }

  function renderEventCell(playerEvent, raid) {
    return <span>{eventMap[playerEvent.event_type](playerEvent, raid)}</span>;
  }

  function renderEventDetailCell(playerEvent, raid) {
    return <span>{eventDetailMap[playerEvent.event_type](playerEvent, raid)}</span>;
  }

  function renderPlayerEvents() {
    const sorted = sortBy(playerEvents, it => it.event_data.time);
    return <>
      {sorted.map((playerEvent, idx) => {
        const currentRaid = raids.find(r => r.raid_id === playerEvent.raid_id);

        return (
          <Table.Row key={idx}>
            <Table.Cell>{new Date(playerEvent.event_data.time * 1000).toLocaleDateString()}</Table.Cell>
            <Table.Cell>{renderEventCell(playerEvent, currentRaid)}</Table.Cell>
            <Table.Cell>{renderEventDetailCell(playerEvent, currentRaid)}</Table.Cell>
            <Table.Cell>{playerEvent.gpp}</Table.Cell>
            { props.showEdit ? <Table.Cell>
              <GppEdit icon guild={guild} raids={raids} playerEvent={playerEvent} handler={editEvent} />
              <GppTransfer icon guild={guild} playerEvent={playerEvent} handler={transferEvent} />
              <GppDelete icon playerEvent={playerEvent} handler={deleteEvent} />
              </Table.Cell> : null}
          </Table.Row>
        )
      })}
    </>
  }

  function closeModal() {
    props.setOpen(false);
  }

  const summaryForPlayer = summary.find(it => it.player_name === props.player);

  return (
    <Modal style={modalStyles} open={props.open} onClose={() => closeModal()}>
      <Modal.Header style={modalStyles}>
        <span>GPP Details for {props.player}</span>
        <span style={{ float: 'right' }}>Total: {(summaryForPlayer && summaryForPlayer.gpp) || 'Unknown'}</span>
      </Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      <Table inverted basic='very' celled compact verticalAlign='center'>
        <Table.Header fullWidth>
          <Table.Row>
            <Table.HeaderCell>
              Time
            </Table.HeaderCell>
            <Table.HeaderCell>
              Event
            </Table.HeaderCell>
            <Table.HeaderCell>
              Details
            </Table.HeaderCell>
            <Table.HeaderCell>
              GPP
            </Table.HeaderCell>
            { props.showEdit ?
            <Table.HeaderCell>
              Modify
            </Table.HeaderCell> : null}
          </Table.Row>
        </Table.Header>
        <Table.Body>
        { playerEvents ? renderPlayerEvents() : <Table.Row><Table.Cell>Loading...</Table.Cell></Table.Row> }
        </Table.Body>
      </Table>
      </Modal.Content>
      <Modal.Actions style={modalStyles}>
        <Button primary onClick={() => closeModal()}>Close</Button>
      </Modal.Actions>
    </Modal>
  );
}

export default GppDetail;
