using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebRTC_React_netcore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WebRTCController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok("TEST");
        }
    }
}
