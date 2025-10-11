using DogHub;

namespace Test;

[TestClass]
public sealed class TestLaunch
{
    [TestMethod]
    public void TestAdd_1()
    {
        Assert.AreEqual(Launch.add(5, 9), 14);
    }
    [TestMethod]
    public void TestAdd_2()
    {
        Assert.AreEqual(Launch.add(3, 3), 6);
    }
}
