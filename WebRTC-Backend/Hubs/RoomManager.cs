using System.Collections.Concurrent;
using System.Collections.Generic;

namespace WebRTC_React_netcore.Hubs
{
    public class RoomManager
    {
        /// <summary>
        /// Room List (key:RoomId)
        /// </summary>
        private ConcurrentDictionary<string, Room> rooms;

        public RoomManager()
        {
            rooms = new ConcurrentDictionary<string, Room>();
        }

        public Room CreateRoom(string connectionId, string name)
        {
            string roomId = Guid.NewGuid().ToString();
            //create new room
            var room = new Room
            {
                RoomId = roomId,
                Name = name,
                HostConnectionId = connectionId
            };
            bool result = rooms.TryAdd(roomId, room);

            if (result)
            {
                return room;
            }
            else
            {
                return null;
            }
        }

        public void DeleteRoom(string roomId)
        {
            rooms.TryRemove(roomId, out _);
        }

        public List<Room> GetAllRooms()
        {
            return rooms.Values.ToList();
        }
    }

}
