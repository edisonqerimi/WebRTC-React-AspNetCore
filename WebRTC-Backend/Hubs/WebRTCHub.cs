using Microsoft.AspNetCore.SignalR;

namespace WebRTC_React_netcore.Hubs
{
    public class WebRTCHub : Hub
    {
        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }
    }
}
