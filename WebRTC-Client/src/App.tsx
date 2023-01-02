import { useEffect, useState, useRef, useMemo } from "react";
import "./App.css";
import {
  HubConnectionBuilder,
  LogLevel,
  HubConnection,
  HubConnectionState,
  HttpTransportType,
} from "@microsoft/signalr";

import { Button, TextField, Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

interface Room {
  roomId: string;
  name: string;
  hostConnectionId: string;
}
function App() {
  const [groupName, setGroupName] = useState<String | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<String>("");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Array<Room> | []>([]);
  let connection = useRef<HubConnection>();

  const [devices, setDevices] = useState<MediaDeviceInfo[] | []>([]);

  const videoRef=useRef<HTMLVideoElement|null>(null);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "roomId", headerName: "Room Id", width: 300 },
      { field: "name", headerName: "Room Name", width: 200 },
      {
        field: "hostConnectionId",
        headerName: "Host Connection Id",
        width: 300,
      },
      {
        field: "delete",
        headerName: "Delete",
        renderCell: (params) => (
          <Button
            // disabled={params.row.hostConnectionId!==connection.current?.connectionId} // disabled if not hoster

            color="error"
            size="large"
            style={{ width: "100%", height: "100%" }}
            onClick={() => onDeleteClick(params.row)}
          >
            Delete
          </Button>
        ),
      },
      {
        field: "join",
        headerName: "Join",
        renderCell: (params) => (
          <Button
            disabled={params.row.roomId === currentRoom?.roomId} // disable joined group
            size="large"
            style={{ width: "100%", height: "100%" }}
            onClick={() => onJoinClick(params.row)}
          >
            Join
          </Button>
        ),
      },
    ],
    [currentRoom, connection]
  );
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        // audio: true // audio not working rn
      })
      .then((stream) => {
        console.log(stream);
        videoRef.current!.srcObject = stream;
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      })
      .finally(() => {
        getDevices();
      });
  }, []);
  useEffect(() => {
    connection.current = new HubConnectionBuilder()
      .configureLogging(LogLevel.Debug)
      .withUrl("/hubs/WebRTCHub", {
        withCredentials: true,
        headers: { "Feature-Policy": "microphone 'self'; camera 'self'" },
      })
      .build();

    connection.current
      .start()
      .then(() => {
        connection.current!.on("created", (room) => {
          setCurrentRoom(room);
          setConnectionStatus("You created room " + room.name);
        });

        connection.current!.on("roomUpdate", (rooms) => {
          setRooms(rooms);
        });

        connection.current!.invoke("GetRooms").catch((err) => {
          console.log(err);
        });

        connection.current!.on("ready", () => {
          console.log("ready");
        });
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    const unloadCallback = () => {
      if (currentRoom) {
        console.log(
          `Unloading window. Notifying peers in ${currentRoom.roomId}.`
        );
        connection
          .current!.invoke("LeaveRoom", currentRoom.roomId)
          .catch((err) => {
            console.error(err.toString());
          });
      }
    };
    window.addEventListener("unload", unloadCallback);

    return () => window.removeEventListener("unload", unloadCallback);
  }, []);

  const getDevices = () => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setDevices(
        devices.filter(
          (device) =>
            device.kind === "audioinput" || device.kind === "videoinput"
        )
      );
    });
  };

  useEffect(() => {
    const deviceChangeCallback = (event: any) => {
      getDevices();
    };
    navigator.mediaDevices.addEventListener(
      "devicechange",
      deviceChangeCallback
    );

    return () =>
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        deviceChangeCallback
      );
  }, []);

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupName(e.target.value);
  };
  const onCreateRoom = () => {
    if (
      connection.current?.state == HubConnectionState.Connected &&
      groupName &&
      groupName!.trim().length > 0
    ) {
      connection.current
        ?.invoke("CreateRoom", groupName)
        .then(() => {
          setGroupName("");
        })
        .catch((err) => console.log(err));
    }
  };
  const onJoinClick = (room: Room) => {
    if (connection.current?.state == HubConnectionState.Connected) {
      connection.current
        ?.invoke("JoinRoom", room.roomId)
        .then(() => {
          setCurrentRoom(room);
          setConnectionStatus("You joined room " + room.name);
        })
        .catch((err) => console.log(err));
    }
  };
  const onLeaveRoom = (room: Room | null) => {
    if (connection.current?.state == HubConnectionState.Connected && room) {
      connection.current
        ?.invoke("LeaveRoom", room.roomId)
        .then(() => {
          setCurrentRoom(null);
          setConnectionStatus("You left room " + room.name);
        })
        .catch((err) => console.log(err));
    }
  };
  const onDeleteClick = async (row: Room) => {
    if (connection.current?.state == HubConnectionState.Connected) {
      if (currentRoom?.roomId == row.roomId) {
        await connection.current
          ?.invoke("LeaveRoom", currentRoom.roomId)
          .then(() => {
            setCurrentRoom(null);
            setConnectionStatus("You left room " + row.name);
          })
          .catch((err) => console.log(err));
      }
      connection.current
        ?.invoke("DeleteRoom", row.roomId)
        .then(() => {
          setConnectionStatus("You deleted room " + row.name);
        })
        .catch((err) => console.log(err));
    }
  };
  return (
    <div className="App">
      <Box>
        <TextField
          size="small"
          label="Name"
          value={groupName}
          onChange={onNameChange}
          style={{ marginRight: 8 }}
        />
        <Button
          style={{ marginRight: 8 }}
          onClick={onCreateRoom}
          variant="contained"
        >
          Create Room
        </Button>
        <Button
          disabled={currentRoom == null}
          onClick={() => onLeaveRoom(currentRoom)}
          color="error"
          variant="contained"
        >
          Leave Room
        </Button>
      </Box>
      <Box>
        {connection.current?.state} | {connectionStatus}
      </Box>
      <Box>
        {devices.map((device) => (
          <Box>
            {device.kind}: {device.label}
          </Box>
        ))}
      </Box>
      <video autoPlay width={500} height={400} ref={videoRef} playsInline></video>
      <div style={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rooms}
          columns={columns}
          pageSize={10}
          getRowId={(row) => row.roomId}
          rowsPerPageOptions={[5]}
          isRowSelectable={() => false}
          getRowClassName={(props) =>
            props.id == currentRoom?.roomId ? "highlight-row" : ""
          }
        />
      </div>
    </div>
  );
}

export default App;
