using DogHub;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Controllers;

[ApiController]
[Route("members")]
public class MembersController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public MembersController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    [HttpGet]
    public IActionResult GetMembers()
    {
        string sqlText = _sql.GetCommand("members");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }
}
