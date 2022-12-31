using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using System.Net;
using WebRTC_React_netcore.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSpaStaticFiles(configuration => {
    configuration.RootPath = "dist";
});
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        policy =>
        {
            policy.AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()
                           .WithOrigins(builder.Configuration["FrontendUrl"]);
        });
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRouting();
app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHub<WebRTCHub>("/hubs/WebRTCHub");
});



app.UseSpaStaticFiles();
app.UseSpa((spa) => {
    if (app.Environment.IsDevelopment())
    {
        spa.UseProxyToSpaDevelopmentServer(app.Configuration["FrontendUrl"]);
    }
});

app.UseCors();

app.Run();
