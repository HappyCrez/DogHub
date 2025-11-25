using DogHub;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Controllers;

[ApiController]
[Route("events")]
public class EventsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public EventsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // GET /events
    [HttpGet]
    public IActionResult GetEvents()
    {
        string sqlText = _sql.GetCommand("events");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // GET /events/{id}  (если раньше был /event/{id}, хочешь — сделаем отдельный контроллер /event)
    [HttpGet("{id:int}")]
    public IActionResult GetEventById(int id)
    {
        string sqlText = _sql.GetCommand("event");
        var parameters = new Dictionary<string, object>
        {
            ["id"] = id
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }

    // GET /events/education  (people_events)
    [HttpGet("education")]
    public IActionResult GetEducationEvents()
    {
        string sqlText = _sql.GetCommand("people_events");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // GET /events/{eventId}/dogs
    [HttpGet("{eventId:int}/dogs")]
    public IActionResult GetEventDogs(int eventId)
    {
        string sqlText = _sql.GetCommand("event_dogs");
        var parameters = new Dictionary<string, object>
        {
            ["event_id"] = eventId
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }

    // GET /events/{eventId}/members
    [HttpGet("{eventId:int}/members")]
    public IActionResult GetEventMembers(int eventId)
    {
        string sqlText = _sql.GetCommand("event_members");
        var parameters = new Dictionary<string, object>
        {
            ["event_id"] = eventId
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }
}
