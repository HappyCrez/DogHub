using DogHub;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Controllers;

[ApiController]
[Route("dogs")]
public class DogsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public DogsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // GET /dogs
    [HttpGet]
    public IActionResult GetDogs()
    {
        string sqlText = _sql.GetCommand("dogs");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // GET /dogs/chiped
    [HttpGet("chiped")]
    public IActionResult GetChipedDogs()
    {
        string sqlText = _sql.GetCommand("chiped");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }
}
