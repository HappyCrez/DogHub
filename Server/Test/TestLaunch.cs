using DogHub;

namespace Test;

[TestClass]
public sealed class TestLaunch
{
    [TestMethod]
    public void TestAdd_1()
    {
        Assert.AreEqual(Launch.Add(5, 9), 14);
    }
    [TestMethod]
    public void TestAdd_2()
    {
        Assert.AreEqual(Launch.Add(3, 3), 6);
    }
}
