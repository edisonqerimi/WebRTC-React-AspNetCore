using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace WebRTC_React_netcore.Hubs
{
    public class WebRTCHub : Hub
    {
        private static RoomManager roomManager = new RoomManager();

        public async Task CreateRoom(string name)
        {
            if (string.IsNullOrWhiteSpace(name)){
                await Clients.Caller.SendAsync("error", "Group name cannot be null or empty.");
            }
            Room room = roomManager.CreateRoom(Context.ConnectionId, name);
            if (room != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);
                await Clients.Caller.SendAsync("created", room);
                await Clients.Group(room.RoomId).SendAsync("ready");
                List<Room> rooms = roomManager.GetAllRooms();
                await Clients.All.SendAsync("roomUpdate", rooms);
            }
            else
            {
                await Clients.Caller.SendAsync("error", "Error occurred when creating a new room.");
            }
        }
        public async Task GetRooms()
        {
            List<Room> rooms = roomManager.GetAllRooms();
            await Clients.Caller.SendAsync("roomUpdate",rooms);
        }
        public async Task JoinRoom(string roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Clients.Group(roomId).SendAsync("ready");
        }
        public async Task LeaveRoom(string roomId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        }
        public async Task DeleteRoom(string roomId)
        {
            roomManager.DeleteRoom(roomId);
            List<Room> rooms = roomManager.GetAllRooms();
            await Clients.All.SendAsync("roomUpdate", rooms);
        }
    }
}
